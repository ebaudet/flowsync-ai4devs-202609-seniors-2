# Design

## Context

Estado actual observado (ver `proposal.md` para la motivación):

- **Backend**: AdonisJS 7 / Lucid 22 / SQLite. El esquema se **genera** desde las migraciones (`database/schema.ts`, no se edita) y los modelos extienden la clase generada sin declarar columnas. Los controladores se registran en `.adonisjs/server/controllers.ts` (autogenerado y versionado) y se referencian desde `start/routes.ts` como `controllers.X`. Toda respuesta pasa por `serialize()` (envoltorio `{ data }`) y por un transformer. El guard por defecto es `api` (tokens Bearer) y la protección se aplica con `.use(middleware.auth())` sobre el grupo. El bodyparser convierte `""` en `null`.
- **Frontend**: React 19 / Vite 8 / Tailwind v4 / react-router. `lib/api.ts` es el único punto de contacto con el backend y traduce los errores de VineJS a mensajes en castellano; `auth/` gestiona la sesión; `routes/` contiene `ProtectedRoute` y `PublicOnlyRoute`. En `components/ui/` solo hay `alert`, `button`, `card`, `input` y `label`.
- Hoy la persona autenticada aterriza en `/profile`.
- No hay base de pruebas y este change no la crea.

## Goals / Non-Goals

**Goals:**
- Tres rutas de tareas con el mismo estilo que las de auth (controlador + validador + transformer + `serialize`).
- Una pantalla `/tasks` construida solo con lo ya existente: sin dependencias nuevas ni componentes de `ui/` nuevos.
- Que el contrato de la API no filtre datos de cuenta del responsable, porque una vez que el cliente los consume ya no se recortan sin romperlo.

**Non-Goals:**
- Orden, agrupación, filtros, paginación (la escala objetivo son ~200 tareas).
- Tests, fechas, borrado, edición de título, reasignación, refresco automático, presencia.
- Cambiar nada del flujo de autenticación salvo los destinos de redirección.

## Decisions

### 1. Datos: tabla `tasks` con `status` como texto validado en la aplicación

Migración nueva `tasks`: `id`, `title` (`string`, 255, not null), `status` (`string`, not null, por defecto `pending`), `assignee_id` (entero, not null, referencia a `users.id`), `created_at`, `updated_at`. **Sin columna de fecha de vencimiento** (restricción 1); las marcas de tiempo son las convencionales de la tabla y **no se exponen** por la API.

- El conjunto de estados se define **una vez** en el backend (constante `TASK_STATUSES = ['pending', 'in_progress', 'done']`) y alimenta el validador. Si el generador de esquema lo admite vía `schema_rules.ts` (`ColumnInfo.tsType`, acotado con `tables.tasks.columns.status` para no afectar a otras tablas), la columna `status` se tipa como unión literal; si no, el tipo se estrecha en el modelo.
- *Alternativas*: `enum` nativo de base de datos (SQLite no lo soporta de verdad; `knex` lo emula con `CHECK` y complica migrar el conjunto) y tabla `statuses` (contradice «conjunto cerrado, no se añaden estados»). Se descarta ambas.
- Ejecutar `node ace migration:run` regenera `database/schema.ts`; ese diff se commitea.

### 2. Modelo y relación

`Task extends TaskSchema` con `@belongsTo(() => User) assignee`. El listado hace `preload('assignee')` para evitar N+1. `User` no necesita relación inversa.

### 3. Contrato de la API

| Operación | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| Listar | `GET /api/v1/tasks` | — | 200 `{ data: Task[] }` |
| Crear | `POST /api/v1/tasks` | `{ title }` | 201 `{ data: Task }` |
| Actualizar | `PATCH /api/v1/tasks/:id` | `{ status }` | 200 `{ data: Task }` / 404 |

`Task` = `{ id, title, status, assignee: { fullName: string | null } }`. Rutas dentro de un grupo `tasks` bajo `/api/v1` con `middleware.auth()`, registradas con `router.get/post/patch` y **sin** `router.resource`, para que `GET /:id` y `DELETE /:id` no existan (404 de ruta no encontrada). Un único `TasksController` con `index`, `store` y `update`.

- **Creación**: `title` y responsable = `auth.getUserOrFail()`; `status` queda al valor por defecto de la columna. Lucid solo devuelve la clave primaria tras el INSERT, así que el controlador hace `await task.refresh()` y `await task.load('assignee')` antes de serializar: el 201 debe llevar `status` y `assignee` ya poblados. El validador solo declara `title`, y VineJS descarta los campos desconocidos (`status`, `assignee`, fechas), por lo que quedan ignorados sin código adicional.
- **Actualización**: el validador declara solo `status` (`vine.enum(TASK_STATUSES)`); `Task.findOrFail(id)` da el 404 y no se comprueba propiedad (restricción 5). Responde la tarea con el responsable precargado.
- **Responsable**: `TaskTransformer` expone `assignee` a través de un `TaskAssigneeTransformer` que hace `pick` solo de `fullName`; nunca `UserTransformer`, que filtraría email, id y fechas (nota de implementación de E3-1). Si se sacara `UserTransformer` por comodidad, la spec (`El responsable no revela datos de cuenta`) lo detecta en revisión.
- **Orden**: la consulta del listado **no lleva `orderBy`** (restricción 4); el orden es el que devuelva la base de datos y no se promete.

### 4. Validación del título

`vine.string().trim().minLength(1).maxLength(255)`. `trim()` convierte «solo espacios» en cadena vacía que `minLength(1)` rechaza; el `""` literal llega como `null` por el bodyparser y lo rechaza `required`. Ambos casos dan 422 sobre `title`. 255 es un valor de ingeniería (ver Puntos abiertos del proposal), sin comportamiento de recorte en ningún punto.

### 5. Frontend: reutilizar el patrón del login

- `lib/types.ts`: `TaskStatus`, `Task`, y el mapa `TASK_STATUS_LABEL` (`pending → Pendiente`, `in_progress → En curso`, `done → Hecho`) en **un único sitio**; el castellano nunca se usa como identificador.
- `lib/api.ts`: `listTasks`, `createTask`, `updateTaskStatus` sobre el mismo `request` (se amplía `RequestOptions.method` con `'PATCH'`). Se añade `title` a `FIELD_LABELS` («el título»). El mensaje «Falta rellenar el título.» ya sale de la regla `required`; para que «solo espacios» dé el mismo mensaje, la comprobación se hace también en cliente antes de enviar (ver 6).
- `pages/tasks-page.tsx` (patrón de `login-page.tsx`), con componentes propios en `components/`: `create-task-form`, `task-row` y `task-status-control`. Se compone con `Card`, `Input`, `Label`, `Button` y `Alert` ya existentes. Carga con el hook de estado local y `FullScreenLoader`/texto de carga; no se introduce librería de datos.
- **Control de estado**: tres `Button` en grupo por fila (el actual con `variant="default"`, el resto `outline`) con `aria-pressed`: un clic, sin diálogo, sin `select` ni componente nuevo de `ui/`. *Alternativa descartada*: `select` nativo o de shadcn (dos interacciones y, en el caso de shadcn, un componente nuevo en `ui/`).
- **Rutas**: `/tasks` dentro de `ProtectedRoute`; `PublicOnlyRoute` y el comodín `*` de `app-routes.tsx` redirigen a `/tasks`; el perfil gana un enlace «Volver a las tareas» y la lista un enlace al perfil. Sin otros cambios en `auth/`.

### 6. Comportamiento de la interfaz

- **Crear**: se recorta el título en cliente; si queda vacío se muestra «Falta rellenar el título.» sin petición (se reutiliza `failWith` de `useAuthForm`, que ya reparte errores por campo; su nombre es de auth pero la lógica es genérica). El `Input` **no** lleva `maxLength`: bloquear la escritura sería un recorte silencioso; el aviso lo da el 422 (`maxLength` → mensaje existente en `translate`). Con éxito, la tarea de la respuesta se **añade al final** del estado local (sin refetch) y el campo se vacía. Con error se conserva el texto. La posición «al final» es una consecuencia de no ordenar, no una regla: ver Puntos abiertos.
- **Cambiar estado**: actualización **optimista**: la fila cambia al instante y, si la petición falla, vuelve al estado anterior y aparece un `Alert`. Cada fila bloquea su propio control mientras su petición está en vuelo para no encadenar cambios cruzados.
- **Estado vacío**: tarjeta con texto explicativo y el formulario de creación. El formulario es el mismo componente en vacío y con tareas.
- **Sin fechas**: `Task` no tiene campos de fecha en el tipo, así que ni se puede pintar ni se prepara.
- **Responsable**: `assignee.fullName?.trim() || 'Sin nombre'`: el backend no recorta `fullName`, así que por API directa puede existir un nombre en blanco, que se pinta como «Sin nombre».
- **Carga fallida**: si `GET /tasks` falla (conexión, 500 o 401) se muestra solo el `Alert` con el mensaje; no se muestra ni la lista, ni el estado vacío (afirmaría «no hay tareas» sin saberlo) ni el formulario. No hay reintento: se recarga la página.
- **Enlace al perfil**: la cabecera de `/tasks` lleva un enlace «Mi perfil»; es el único camino a «Cerrar sesión» desde la portada.

### 7. Documentación y código generado

La tabla de rutas de `CLAUDE.md` pasa a incluir las tres nuevas. Los diffs de `.adonisjs/` (registro de controladores y registro Tuyau) se regeneran arrancando el servidor y se commitean, como indica el repositorio.

## Risks / Trade-offs

- **[Orden no definido]** SQLite sin `ORDER BY` suele devolver por clave primaria, pero no está garantizado, y la tarea creada se añade al final localmente: tras recargar podría aparecer en otro sitio. → Aceptado y anotado como punto abierto (PA-3); no se inventa criterio.
- **[Marcar Hecho por error es muy barato]** (PA-7): un clic, sin confirmación, y se puede volver atrás desde cualquier estado. → Es la conducta pedida (E2-4 CA-1); el camino de vuelta es el propio control.
- **[Sin tests]** No hay red de seguridad automática. → La verificación en `tasks.md` es manual y reproducible (`curl` contra cada escenario de la spec, más `typecheck`, `lint` y `build`).
- **[401 a mitad de sesión]** Si el token deja de valer mientras se usa la lista, `request` mapea el 401 a «Tu sesión ha caducado…» y se muestra el aviso, pero la sesión local no se limpia hasta recargar. → Aceptado; mismo comportamiento que ya tiene el resto de llamadas autenticadas.
- **[Doble clic rápido en crear]** → El botón se deshabilita durante el envío, de modo que no se duplica la tarea.
- **[`Task.status` como texto]** Un valor inválido solo lo impide la validación, no la base de datos. → Único punto de entrada de escritura es el controlador validado.

## Migration Plan

1. `node ace migration:run` crea `tasks` y regenera `database/schema.ts`. No hay datos previos que migrar.
2. Rollback: `node ace migration:rollback` (la migración tiene `down`) y revertir el commit; ningún dato existente depende de la tabla.

## Open Questions

- Si el generador de esquema acepta tipar `status` como unión desde `schema_rules.ts` o hay que estrecharlo en el modelo: se resuelve al implementar leyendo el `.d.ts`; no cambia el contrato.
