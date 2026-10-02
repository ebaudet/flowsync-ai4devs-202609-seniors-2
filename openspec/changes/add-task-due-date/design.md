# Design

## Context

Estado actual observado (motivación en `proposal.md`):

- **Backend**: AdonisJS 7 / Lucid 22 / SQLite. `database/schema.ts` se **genera** al migrar y el modelo `Task` solo declara la relación `assignee`; `database/schema_rules.ts` ya estrecha el tipo de `tasks.status`. `TasksController` tiene `index`, `store` y `update`; las rutas están en `start/routes.ts` con `router.get/post/patch` (sin `router.resource`). El bodyparser ya convierte `""` en `null` (`convertEmptyStringsToNull`). La API responde siempre con `serialize(Transformer.transform(...))`.
- **`BaseTransformer`** (`@adonisjs/http-transformers`) solo recibe el recurso en el constructor: **no tiene acceso al `HttpContext`**. Hay que hacerle llegar el día de referencia por otra vía (decisión 4).
- **CORS**: `headers: true` refleja las cabeceras pedidas, así que `X-Client-Date` no necesita configuración nueva.
- **Frontend**: `lib/api.ts` es el único punto de contacto con el backend y traduce los errores de VineJS (`translate` + `FIELD_LABELS`). Solo existen `alert`, `button`, `card`, `input` y `label` en `components/ui/`; no hay ningún componente de fecha. No hay ruta por tarea.
- La spec vigente prohíbe la fecha y la lectura individual: este change las invierte (ver delta de `tasks`).

## Goals / Non-Goals

**Goals:**
- Una única implementación de la regla de vencimiento, en el modelo, evaluada en cada lectura.
- Que el veredicto lo dé siempre el backend, con el día de quien mira.
- La superficie mínima de frontend que hace alcanzables CA-2/3/4: abrir una tarea, editar su fecha, ver «Vencida».

**Non-Goals:**
- Pantalla de detalle completa (título editable, reasignación, estado, etc.): `/tasks/:id` es un esqueleto con lo imprescindible.
- Tests, componente de calendario, notificaciones, recurrencia, orden o filtro por fecha, cambios en la lista o en el formulario de creación.
- Resolver los puntos abiertos PA-7 y PA-8 del PRD.

## Decisions

### 1. Dato: columna `due_date` de tipo `date`, nullable, tratada como texto `YYYY-MM-DD`

Migración nueva `alterTable('tasks')` que añade `table.date('due_date').nullable()`; `down()` la elimina. Al ser nullable, las filas existentes siguen siendo válidas sin backfill. `node ace migration:run` regenera `database/schema.ts`, que se commitea sin editar a mano.

Por defecto el generador mapea `date` a `DateTime` de luxon (`@column.date`), y un `DateTime` arrastra huso: justo lo que una fecha de calendario no debe tener (CA-19: «la fecha no se mueve según quien mira»). Se añade en `schema_rules.ts` una regla para `tasks.due_date` con `tsType: 'string | null'` y `@column()` plano, igual que ya se hace con `status`. Así el valor entra y sale como cadena `YYYY-MM-DD` y las comparaciones son de cadenas ISO, que ordenan igual que las fechas.

- *Alternativas*: `DateTime` con `zone: 'utc'` (riesgo de desplazar el día al serializar); marca de tiempo al final del día (inventa una hora que el producto no tiene). Se descartan.
- Verificar en el `.d.ts`/salida generada que la regla produce `string | null`; si el generador no admite `null` en `tsType`, estrechar en el modelo.

### 2. La regla vive en el modelo y solo allí

`Task` gana un método `isOverdueOn(today: string): boolean` con la regla completa:

```
dueDate !== null && dueDate < today && status !== 'done'
```

La comparación es estricta y de cadenas ISO, de modo que «hoy» no vence (CA-5) y no hay aritmética de husos que pueda equivocarse de día. Ni el controlador ni el transformer ni el frontend reimplementan la condición. No se persiste nada de esto ni hay jobs que marquen tareas (el cruce de medianoche se resuelve solo porque se evalúa al leer, CA-20).

### 3. Día de referencia: cabecera `X-Client-Date`, opcional, con respaldo UTC

Una función de apoyo (`app/services/`, vía `node ace make:service`) `resolveReferenceDay(request)`:
- sin cabecera → día actual en UTC del servidor (`DateTime.utc().toISODate()`; `TZ=UTC` ya está en `.env.example`);
- con cabecera → debe cumplir `^\d{4}-\d{2}-\d{2}$` **y** ser un día real (`DateTime.fromISO(v, { zone: 'utc' }).isValid`); si no, 422 con el formato de error de VineJS (`{ errors: [{ field: 'X-Client-Date', rule: 'format', message }] }`) para que `translate` del cliente lo trate como el resto.

Se elige cabecera frente a parámetro de query porque es uniforme en `GET`, `POST` y `PATCH` sin ensuciar el cuerpo ni las URLs. Opcional para no romper los `.http` ni clientes existentes; el coste asumido es que un cliente que no la envíe recibe el veredicto en día UTC.

La función se llama en los cuatro métodos del controlador **antes** de tocar la base de datos, de modo que una cabecera inválida no modifique nada.

### 4. Cómo llega el día al transformer

`TaskTransformer.toObject()` añade `dueDate` (vía `pick`) e `isOverdue`. Como el transformer no ve el `HttpContext`, el controlador deja el día en el propio recurso antes de transformar: un helper `withReferenceDay(task | tasks, day)` que escribe `task.$extras.referenceDay`, y el transformer hace `this.resource.isOverdueOn(this.resource.$extras.referenceDay)`. Es la vía más corta que no toca `BaseTransformer` ni el serializer.

- *Alternativa A*: calcular `isOverdue` en el controlador y mezclarlo en el resultado (`{ ...transformed, isOverdue }`): rompe la convención «todo pasa por el transformer».
- *Alternativa B*: inyectar `HttpContext` en el constructor del transformer vía contenedor: depende de cómo resuelva el serializer las clases; se prueba solo si `$extras` resulta feo al implementar.
- Si `$extras.referenceDay` falta (olvido en un controlador) el transformer **debe fallar** en vez de asumir un día: un veredicto silencioso con el día equivocado es el fallo que este change quiere evitar.

### 5. Contrato de la API

| Operación | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| Listar | `GET /api/v1/tasks` | — | 200 `{ data: Task[] }` |
| **Leer** | `GET /api/v1/tasks/:id` | — | 200 `{ data: Task }` / 404 |
| Crear | `POST /api/v1/tasks` | `{ title, dueDate? }` | 201 `{ data: Task }` |
| Actualizar | `PATCH /api/v1/tasks/:id` | `{ status?, dueDate? }` | 200 `{ data: Task }` / 404 / 422 |

`Task` = `{ id, title, status, dueDate: string | null, isOverdue: boolean, assignee: { fullName } }`. La ruta `GET :id` se añade al grupo `tasks` existente (con `middleware.auth()`) y `show` hace `Task.findOrFail` + `load('assignee')`. `DELETE` sigue sin existir.

**Validadores** (`app/validators/task.ts`):
- Constructor compartido `dueDate()` que valida el formato con `vine.string().regex(/^\d{4}-\d{2}-\d{2}$/)` y el día real con una regla propia basada en luxon (rechaza `2026-02-30`). No se usa `vine.date()` porque devuelve `Date` y reintroduce el huso.
- `createTaskValidator`: `title` + `dueDate: dueDate().nullable().optional()`. `isOverdue` y cualquier otro campo los descarta VineJS.
- `updateTaskValidator`: `status: vine.enum(TASK_STATUSES).optional()` y `dueDate: dueDate().nullable().optional()`.
- **Distinguir «ausente» de «vacío»**: con `.nullable().optional()`, `undefined` no aparece en el resultado y `null` sí (el bodyparser ya convirtió `""` en `null`). El controlador usa `'dueDate' in payload` y escribe `null` para quitarla. **Comportamiento a comprobar al implementar**: que `optional()` no colapse `null` en `undefined` para `dueDate`; si lo hiciera, ordenar `nullable().optional()` o leer el campo crudo.
- **«Al menos uno de los dos»**: tras validar, si `payload` no trae `status` ni `dueDate`, el controlador lanza un 422 con el mismo formato que VineJS (`rule: 'required'`, `field: 'status'`, mantiene el escenario de la spec). `status: null` junto a un `dueDate` válido se trata como `status` ausente (no se toca): se asume y queda anotado aquí.
- El controlador aplica `task.merge(...)` solo con las claves presentes y `save()`; devuelve la tarea con `assignee` cargado.

### 6. Lectura individual (restricción 5) y su punto abierto

Se añade `GET /tasks/:id` porque la historia dice «al abrir la tarea» y ese endpoint no existía. Es la **superficie mínima**: misma forma que el listado, sin campos nuevos ni permisos. **Punto abierto (PA-6 del PRD)**: la pantalla de detalle completa (qué más se edita al abrir una tarea, reasignación, título) se diseñará aparte; cuando llegue, `/tasks/:id` es su base y este endpoint puede ampliar la representación sin romper a nadie. Hasta entonces no se promete nada más.

### 7. Frontend

- `lib/types.ts`: `Task` gana `dueDate: string | null` e `isOverdue: boolean`. El comentario «Sin fechas…» de `Task` se corrige.
- `lib/api.ts`: `request` añade a **toda** petición de tareas la cabecera `X-Client-Date` con el día **local** (`getFullYear/getMonth/getDate` rellenados a dos dígitos; **no** `toISOString()`, que da el día UTC y reproduciría justo el fallo de huso). `RequestOptions` ya soporta `PATCH`. Nuevas funciones `getTask(token, id)` y `updateTaskDueDate(token, id, dueDate | null)` (envía `{ dueDate: null }` para quitar). `FIELD_LABELS.dueDate = 'la fecha'` y un caso en `translate` para que un 422 sobre `dueDate` dé «Introduce una fecha válida.» (el `default` actual diría «Revisa la fecha.»).
- Ruta `/tasks/:id` dentro de `ProtectedRoute`, página `pages/task-page.tsx`. Estados: cargando, 404 («No se encontró la tarea.»), error genérico (mensajes ya traducidos por `ApiError`), y vista. Un 404 se detecta por `ApiError.status === 404` (hoy `toApiError` lo traduce al mensaje genérico de servidor; se añade el caso 404 con su texto).
- **Campo de fecha**: `<Input type="date">` nativo con el `Label` existente; no se trae ningún componente de calendario (la nota de riesgo de FS-118.4 pedía decidirlo antes de empezar: queda decidido). Guardado automático en `onChange`, **solo cuando el valor es una fecha completa** (`''` no se envía): los navegadores emiten `''` mientras la fecha se escribe a medias, y tratarlo como «quitar» borraría la fecha sin que la persona lo pida. Quitar es **solo** el botón «Quitar fecha» (`Button` existente, sin diálogo; habilitado solo si hay fecha).
- **Reflejo instantáneo y error**: el valor mostrado sale de un estado local; al responder el PATCH se sustituye la tarea entera por la respuesta (así `isOverdue` viene del servidor). Si falla, el campo vuelve a la fecha guardada y el mensaje de `fieldErrors.dueDate` se pinta bajo el campo con el componente `field-error.tsx` existente. Un cambio nuevo bloquea el campo mientras hay uno en vuelo (como `busyIds` en la lista).
- **Señal «Vencida»**: cuando `task.isOverdue`, un bloque con icono (`lucide-react`, ya en uso) y el texto «Vencida», con `role="status"` para que se anuncie. El frontend solo lee el booleano; no compara fechas.
- **Lista**: `TaskRow` envuelve el título en `<Link to={`/tasks/${task.id}`}>`. No se pinta `dueDate` ni `isOverdue` en la fila.
- **Creación**: `create-task-form.tsx` y `createTask` no cambian (CA-1 / CA-12): no se envía `dueDate`.
- Tras volver a la lista, la lista se recarga desde la API (como hoy); no hay caché compartida que invalidar.

## Risks / Trade-offs

- [Día equivocado por cliente sin cabecera] → El respaldo UTC puede dar el veredicto del día anterior/siguiente a quien lo lee. Se acepta (decisión del usuario) y el frontend siempre la envía.
- [`$extras` como canal del día] → Hace implícita una dependencia entre controlador y transformer. Mitigación: el transformer falla si falta el día; un único helper lo escribe.
- [`optional()` colapsa `null`] → Quitar la fecha dejaría de funcionar sin error. Mitigación: comprobarlo con los `.http` de «quitar con `null` y con `""`» antes de dar por terminada la tarea de validadores.
- [Autoguardado frente a fecha a medias] → Mitigación en la decisión 7: solo se envía una fecha completa y «quitar» es un botón explícito.
- [Migrar toca la base de desarrollo, que es el único SQLite] → La migración es aditiva y nullable; `down()` la revierte. Hacer `node ace migration:run` solo en la rama.
- [Sin tests por petición expresa] → La verificación es manual (`http/tasks-fecha-vencimiento.http` y la app) más lint, formato y typecheck. Los bordes de la regla (ayer / hoy / mañana / sin fecha / `done`) quedan cubiertos solo por esos escenarios manuales.
- [Cambios de spec en cadena] → Los requisitos «sin lectura individual», «tres operaciones» y «sin fecha» se invierten a propósito; el delta los reescribe todos para que la spec principal no quede contradictoria tras archivar.

## Migration Plan

1. Rama `feat/add-task-due-date`; `node ace migration:run` aplica la columna y regenera `database/schema.ts`.
2. Desplegar backend y frontend a la vez no es necesario: el backend añade campos (`dueDate`, `isOverdue`), que un frontend antiguo ignora, y la cabecera es opcional.
3. Reversión: `node ace migration:rollback` elimina `due_date`; el resto se revierte con el commit.

## Open Questions

- **PA-6 (detalle de tarea)**: qué más contendrá la pantalla de detalle real; `/tasks/:id` es provisional y no fija su forma.
- **PA-7**: si volver de `done` con la fecha pasada debe poder deshacerse por una vía más fácil; la regla ya hace que la tarea vuelva a estar vencida (escenario «Volver desde hecha»).
- **PA-8**: qué ve quien pierde un cambio de fecha concurrente; no se aborda (última escritura gana).
