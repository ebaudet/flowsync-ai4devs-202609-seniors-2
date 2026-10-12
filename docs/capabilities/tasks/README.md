# Capability `tasks`: las tareas del equipo

## Qué hace

Da al equipo una **lista de trabajo compartida**: cualquier cuenta con sesión crea tareas, ve las de todos, cambia su estado y, si quiere, les pone una fecha de vencimiento. Cada tarea lleva un título, un responsable y uno de tres estados. El propósito completo está en el apartado `Purpose` de [la spec](../../../openspec/specs/tasks/spec.md).

**Qué debe cumplir cada cosa lo dice la spec, y este README no lo repite.** Los enlaces de abajo llevan al requisito exacto. Si una regla no coincide con lo que aquí se describe, manda la spec.

## Endpoints

Todos cuelgan de `/api/v1/tasks` y exigen un token de acceso (`Authorization: Bearer <token>`, el que devuelven `POST /auth/signup` y `POST /auth/login`). Las rutas salen de [`backend/start/routes.ts`](../../../backend/start/routes.ts) y se pueden listar con `node ace list:routes` desde `backend/`.

| Ruta | Controlador | Qué hace | Entradas | Requisitos |
|---|---|---|---|---|
| `GET /api/v1/tasks` | [`TasksController.index`](../../../backend/app/controllers/tasks_controller.ts) | La lista compartida | `status` (query, opcional) | [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio), [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado), [Un filtro válido sin resultados es una lista vacía legítima](../../../openspec/specs/tasks/spec.md#requirement-un-filtro-válido-sin-resultados-es-una-lista-vacía-legítima), [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío), [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento), [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) |
| `POST /api/v1/tasks` | `TasksController.store` | Crea una tarea | `title` (cuerpo) | [Creación de una tarea con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título), [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título), [Aviso ante un título demasiado largo](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo), [Fecha de vencimiento opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional) |
| `GET /api/v1/tasks/:id` | `TasksController.show` | Una tarea, con su vencimiento | `today` (query, obligatorio) | [Consulta de una tarea suelta](../../../openspec/specs/tasks/spec.md#requirement-consulta-de-una-tarea-suelta), [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida), [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira), [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) |
| `PATCH /api/v1/tasks/:id/status` | [`TaskStatusesController.update`](../../../backend/app/controllers/task_statuses_controller.ts) | Cambia el estado | `status` (cuerpo) | [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea), [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos) |
| `PUT /api/v1/tasks/:id/due-date` | [`TaskDueDatesController.update`](../../../backend/app/controllers/task_due_dates_controller.ts) | Fija, cambia o retira la fecha | `dueDate` y `today` (cuerpo) | [Fijar, cambiar y retirar la fecha de vencimiento](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento), [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida), [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira) |

Que todas exijan sesión está en [Las tareas exigen sesión](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión). Las respuestas de éxito van envueltas en `{ "data": ... }` por el serializer de [`providers/api_provider.ts`](../../../backend/providers/api_provider.ts).

## Reglas de negocio

Las reglas viven en [`openspec/specs/tasks/spec.md`](../../../openspec/specs/tasks/spec.md), y esa es la única copia. Este mapa solo dice **dónde mirar** y **dónde se aplica cada una en el código**.

| Tema | Requisitos en la spec | Dónde se aplica |
|---|---|---|
| Crear una tarea y su título | [Creación de una tarea con solo el título](../../../openspec/specs/tasks/spec.md#requirement-creación-de-una-tarea-con-solo-el-título), [Ninguna tarea sin título](../../../openspec/specs/tasks/spec.md#requirement-ninguna-tarea-sin-título), [Aviso ante un título demasiado largo](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-un-título-demasiado-largo) | [`createTaskValidator`](../../../backend/app/validators/task.ts) y `TasksController.store` |
| La lista compartida y su filtro por estado | [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio), [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado), [Un filtro válido sin resultados es una lista vacía legítima](../../../openspec/specs/tasks/spec.md#requirement-un-filtro-válido-sin-resultados-es-una-lista-vacía-legítima), [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío) | [`listTasksValidator`](../../../backend/app/validators/task.ts) (hoy **no** rechaza un estado inventado: ver «Divergencias»), `TasksController.index` y `DEFAULT_LIST_STATUSES` en [`models/task.ts`](../../../backend/app/models/task.ts) |
| Los tres estados y cómo se cambian | [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos), [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea) | `TASK_STATUSES` en el modelo y `updateTaskStatusValidator` |
| El responsable que enseña cada tarea | [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) | [`TaskAssigneeTransformer`](../../../backend/app/transformers/task_assignee_transformer.ts), que hoy solo usa `TaskDetailTransformer` (consulta suelta y cambio de fecha). La lista, la creación y el cambio de estado usan `TaskTransformer`, que **no** lo aplica: ver «Divergencias» |
| La fecha de vencimiento y cuándo una tarea está vencida | [Fecha de vencimiento opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional), [Fijar, cambiar y retirar la fecha de vencimiento](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento), [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida), [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira) | `Task.isOverdueOn` en el modelo, `taskReferenceDayValidator`, `setTaskDueDateValidator` y `toCalendarDay` en el [validador](../../../backend/app/validators/task.ts), y [`TaskDetailTransformer`](../../../backend/app/transformers/task_detail_transformer.ts) |
| La lista no lleva el vencimiento | [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento) | [`TaskTransformer`](../../../backend/app/transformers/task_transformer.ts), distinto del de detalle a propósito |
| Solo con sesión | [Las tareas exigen sesión](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión) | `middleware.auth()` sobre el grupo de rutas, en [`start/routes.ts`](../../../backend/start/routes.ts) |

### Interfaz

Los requisitos de interfaz de la misma spec se aplican en el frontend. Todas las llamadas a la API pasan por [`frontend/src/lib/api.ts`](../../../frontend/src/lib/api.ts). **Esta tabla dice dónde se aplican, no si se cumplen**: no se ha comprobado en este README.

| Pantalla o pieza | Requisitos en la spec |
|---|---|
| La lista: [`tasks-page.tsx`](../../../frontend/src/pages/tasks-page.tsx) y [`task-item.tsx`](../../../frontend/src/components/task-item.tsx) | [Pantalla de la lista del equipo](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-la-lista-del-equipo), [El espacio sin tareas](../../../openspec/specs/tasks/spec.md#requirement-el-espacio-sin-tareas), [Crear una tarea desde la lista](../../../openspec/specs/tasks/spec.md#requirement-crear-una-tarea-desde-la-lista), [Aviso al intentar crear sin un título válido](../../../openspec/specs/tasks/spec.md#requirement-aviso-al-intentar-crear-sin-un-título-válido), [Cambiar el estado desde la propia fila](../../../openspec/specs/tasks/spec.md#requirement-cambiar-el-estado-desde-la-propia-fila), [Una sola vista de tareas, sin señales de presencia](../../../openspec/specs/tasks/spec.md#requirement-una-sola-vista-de-tareas-sin-señales-de-presencia) |
| El filtro: [`task-filter.tsx`](../../../frontend/src/components/task-filter.tsx) y el estado en la URL de `tasks-page.tsx` | [El control para acotar la lista](../../../openspec/specs/tasks/spec.md#requirement-el-control-para-acotar-la-lista), [El filtro se pide en la dirección de la lista](../../../openspec/specs/tasks/spec.md#requirement-el-filtro-se-pide-en-la-dirección-de-la-lista), [Una lista sin filas no significa siempre lo mismo](../../../openspec/specs/tasks/spec.md#requirement-una-lista-sin-filas-no-significa-siempre-lo-mismo), [Lo que sale de la vista no se pierde](../../../openspec/specs/tasks/spec.md#requirement-lo-que-sale-de-la-vista-no-se-pierde) |
| El detalle: [`task-page.tsx`](../../../frontend/src/pages/task-page.tsx) | [Pantalla de una tarea](../../../openspec/specs/tasks/spec.md#requirement-pantalla-de-una-tarea), [Poner y quitar la fecha desde la pantalla de la tarea](../../../openspec/specs/tasks/spec.md#requirement-poner-y-quitar-la-fecha-desde-la-pantalla-de-la-tarea), [Aviso ante una fecha que no vale](../../../openspec/specs/tasks/spec.md#requirement-aviso-ante-una-fecha-que-no-vale), [La señal de tarea vencida](../../../openspec/specs/tasks/spec.md#requirement-la-señal-de-tarea-vencida), [No tener fecha no se penaliza](../../../openspec/specs/tasks/spec.md#requirement-no-tener-fecha-no-se-penaliza) |

### Datos y errores

- **Tabla `tasks`**: `id`, `title`, `status`, `assignee_id` (clave foránea a `users` con borrado en cascada), `due_date` (nulable, un día sin hora), `created_at` y `updated_at`. Migraciones: [`create_tasks_table`](../../../backend/database/migrations/1786642030284_create_tasks_table.ts) y [`add_due_date_to_tasks_table`](../../../backend/database/migrations/1786644500000_add_due_date_to_tasks_table.ts). El modelo extiende la clase generada en `database/schema.ts`, que no se edita a mano.
- **Errores**: los de validación (`422`) y de sesión (`401`) llegan como `{ "errors": [{ "message", "rule", "field" }] }`. Una tarea que no existe (o un `:id` que no es un número) responde `404` con `E_ROW_NOT_FOUND`, que **no** tiene ese formato y en desarrollo trae además `stack` y rutas absolutas.

## Divergencias conocidas entre el código y la spec

Comprobadas el 2026-10-12 sobre la rama `s4/start`. **Si arreglas alguna, borra su línea de aquí.** Ojo: los comentarios de `validators/task.ts` y de `TasksController.index` afirman justo lo contrario de lo que hace la primera.

- **Un estado inventado en la lista no da `422`.** `GET /api/v1/tasks?status=archivado` responde `200` con lista vacía, porque `listTasksValidator` declara `status` como texto libre (commit `8c15707`). Lo exige [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío).
- **La lista, la creación y el cambio de estado devuelven el email del responsable**, porque `TaskTransformer` serializa el `assignee` con `UserTransformer`. Lo prohíbe [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable). Solo la consulta de una tarea suelta y el cambio de fecha cumplen.

## Cómo probarlo en local

Salvo `make`, los comandos npm y `node ace` se ejecutan desde `backend/` (o `frontend/`): no hay `package.json` en la raíz.

### Arrancar

Desde la raíz del repo, con GNU Make:

```bash
make setup   # instala, crea los .env que falten y migra; idempotente, no pisa un .env existente
make start   # API en http://localhost:3333 y frontend en http://localhost:5173
```

Sin Make, los pasos a mano están en [`CLAUDE.md`](../../../CLAUDE.md). **Cuidado**: `make clean` borra `node_modules` y la base de desarrollo (`backend/tmp/db.sqlite3`), y copiar `.env.example` sobre `.env` a mano pisa tu `APP_KEY`.

### Probar la API a mano

Esto **escribe en la base de desarrollo** (`backend/tmp/db.sqlite3`). La contraseña admite de 8 a 32 caracteres, y repetir un email ya registrado da `422`: en ese caso, entra con `POST /auth/login` (mismo cuerpo, sin `fullName` ni `passwordConfirmation`) y usa su `data.token`.

```bash
API=http://localhost:3333/api/v1
JSON='Content-Type: application/json'

# 1. Una cuenta (la respuesta trae data.token)
curl -s $API/auth/signup -H "$JSON" -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secreto123","passwordConfirmation":"secreto123"}'
TOKEN='pega-aquí-el-token'
AUTH="Authorization: Bearer $TOKEN"
TODAY=$(date +%F)

# 2. Crear, listar y filtrar (anota el id de la tarea creada)
curl -s $API/tasks -H "$AUTH" -H "$JSON" -d '{"title":"Revisar el informe"}'
curl -s $API/tasks -H "$AUTH"
curl -s "$API/tasks?status=done" -H "$AUTH"

# 3. Una tarea suelta, con su vencimiento (today es obligatorio)
ID=1   # el id de la respuesta del POST
curl -s "$API/tasks/$ID?today=$TODAY" -H "$AUTH"

# 4. Cambiar el estado y la fecha de vencimiento
curl -s -X PATCH $API/tasks/$ID/status -H "$AUTH" -H "$JSON" -d '{"status":"in_progress"}'
curl -s -X PUT $API/tasks/$ID/due-date -H "$AUTH" -H "$JSON" -d "{\"dueDate\":\"2030-01-01\",\"today\":\"$TODAY\"}"
```

Con una fecha anterior a `today` en `dueDate` la respuesta sale vencida, y con `"dueDate": null` se retira la fecha. Sin el encabezado `Authorization`, cualquiera de estas rutas responde `401`.

### Tests

```bash
cd backend
npm test                                  # toda la suite
node ace test functional --files=<nombre> # un fichero
node ace test --tests="<título>"          # un test por título
```

- **A 2026-10-12 `tasks` no tiene ningún test**; comprueba `backend/tests/functional/` por si eso ya cambió. Los que había eran los de `auth`, en [`backend/tests/functional/auth/`](../../../backend/tests/functional/auth/). Los de `tasks` irían en `backend/tests/functional/tasks/` (la suite `functional` de [`adonisrc.ts`](../../../backend/adonisrc.ts) recoge `tests/functional/**/*.spec.ts`) y pueden seguir el estilo de los de `auth`.
- **La suite usa la misma base que el servidor de desarrollo**, así que cada grupo aísla con `group.each.setup(() => testUtils.db().withGlobalTransaction())`. Sin eso, los tests ensucian tus datos locales.
- **Con el servidor de desarrollo arrancado en el 3333, la suite puede fallar con `listen EADDRINUSE: address already in use ::1:3333`**, porque levanta su propio servidor HTTP (así ocurrió al prepararlo). Se evita con otro puerto: `PORT=3398 npm test`.
- Antes de dar algo por bueno: `npm run lint` y `npm run typecheck` en `backend/`, y `npm run build` y `npm run lint` en `frontend/`.
