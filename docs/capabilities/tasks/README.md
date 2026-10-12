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
| La lista compartida y su filtro por estado | [Una sola lista compartida del espacio](../../../openspec/specs/tasks/spec.md#requirement-una-sola-lista-compartida-del-espacio), [Acotar la lista por estado](../../../openspec/specs/tasks/spec.md#requirement-acotar-la-lista-por-estado), [Un filtro válido sin resultados es una lista vacía legítima](../../../openspec/specs/tasks/spec.md#requirement-un-filtro-válido-sin-resultados-es-una-lista-vacía-legítima), [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío) | [`listTasksValidator`](../../../backend/app/validators/task.ts), `TasksController.index` y `DEFAULT_LIST_STATUSES` en [`models/task.ts`](../../../backend/app/models/task.ts) |
| Los tres estados y cómo se cambian | [Tres estados fijos](../../../openspec/specs/tasks/spec.md#requirement-tres-estados-fijos), [Cambio de estado de cualquier tarea](../../../openspec/specs/tasks/spec.md#requirement-cambio-de-estado-de-cualquier-tarea) | `TASK_STATUSES` en el modelo y `updateTaskStatusValidator` |
| El responsable que enseña cada tarea | [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable) | [`TaskAssigneeTransformer`](../../../backend/app/transformers/task_assignee_transformer.ts) |
| La fecha de vencimiento y cuándo una tarea está vencida | [Fecha de vencimiento opcional](../../../openspec/specs/tasks/spec.md#requirement-fecha-de-vencimiento-opcional), [Fijar, cambiar y retirar la fecha de vencimiento](../../../openspec/specs/tasks/spec.md#requirement-fijar-cambiar-y-retirar-la-fecha-de-vencimiento), [Cuándo una tarea está vencida](../../../openspec/specs/tasks/spec.md#requirement-cuándo-una-tarea-está-vencida), [El día de referencia lo pone quien mira](../../../openspec/specs/tasks/spec.md#requirement-el-día-de-referencia-lo-pone-quien-mira) | `Task.isOverdueOn` en el modelo, `setTaskDueDateValidator` y [`TaskDetailTransformer`](../../../backend/app/transformers/task_detail_transformer.ts) |
| La lista no lleva el vencimiento | [La lista no lleva el vencimiento](../../../openspec/specs/tasks/spec.md#requirement-la-lista-no-lleva-el-vencimiento) | [`TaskTransformer`](../../../backend/app/transformers/task_transformer.ts), distinto del de detalle a propósito |
| Solo con sesión | [Las tareas exigen sesión](../../../openspec/specs/tasks/spec.md#requirement-las-tareas-exigen-sesión) | `middleware.auth()` sobre el grupo de rutas |

Los requisitos de **interfaz** de la misma spec (pantalla de la lista, pantalla de una tarea, control del filtro…) se aplican en el frontend: [`tasks-page.tsx`](../../../frontend/src/pages/tasks-page.tsx), [`task-page.tsx`](../../../frontend/src/pages/task-page.tsx), [`task-filter.tsx`](../../../frontend/src/components/task-filter.tsx) y [`task-item.tsx`](../../../frontend/src/components/task-item.tsx). Todas las llamadas a la API pasan por [`frontend/src/lib/api.ts`](../../../frontend/src/lib/api.ts).

## Divergencias conocidas entre el código y la spec

Comprobadas el 2026-10-12 sobre la rama `s4/start`. **Si arreglas alguna, borra su línea de aquí.**

- **Un estado inventado en la lista no da `422`.** `GET /api/v1/tasks?status=archivado` responde `200` con lista vacía, porque `listTasksValidator` declara `status` como texto libre (commit `8c15707`). Lo exige [Un estado que no existe se rechaza, no se responde vacío](../../../openspec/specs/tasks/spec.md#requirement-un-estado-que-no-existe-se-rechaza-no-se-responde-vacío).
- **La lista, la creación y el cambio de estado devuelven el email del responsable**, porque `TaskTransformer` serializa el `assignee` con `UserTransformer`. Lo prohíbe [Lo que cada tarea muestra de su responsable](../../../openspec/specs/tasks/spec.md#requirement-lo-que-cada-tarea-muestra-de-su-responsable). Solo la consulta de una tarea suelta y el cambio de fecha cumplen.

## Cómo probarlo en local

Todos los comandos se ejecutan desde `backend/` (o `frontend/`). No hay `package.json` en la raíz.

### Arrancar

```bash
cd backend
npm install
cp .env.example .env && node ace generate:key   # solo la primera vez
node ace migration:run                          # crea tmp/db.sqlite3
npm run dev                                     # API en http://localhost:3333
```

Para ver las pantallas, en otra terminal:

```bash
cd frontend
npm install
npm run dev
```

### Probar la API a mano

Esto **escribe en la base de desarrollo** (`backend/tmp/db.sqlite3`). Cada petición lleva el token que devuelve el registro, en `data.token`:

```bash
API=http://localhost:3333/api/v1
JSON='Content-Type: application/json'

# 1. Una cuenta (la respuesta trae data.token)
curl -s $API/auth/signup -H "$JSON" -d '{"fullName":"Ada Lovelace","email":"ada@example.com","password":"secreto123","passwordConfirmation":"secreto123"}'
TOKEN=<pega aquí el token>
AUTH="Authorization: Bearer $TOKEN"
TODAY=$(date +%F)

# 2. Crear, listar y filtrar
curl -s $API/tasks -H "$AUTH" -H "$JSON" -d '{"title":"Revisar el informe"}'
curl -s $API/tasks -H "$AUTH"
curl -s "$API/tasks?status=done" -H "$AUTH"

# 3. Una tarea suelta, con su vencimiento (today es obligatorio)
curl -s "$API/tasks/1?today=$TODAY" -H "$AUTH"

# 4. Cambiar el estado y la fecha de vencimiento
curl -s -X PATCH $API/tasks/1/status -H "$AUTH" -H "$JSON" -d '{"status":"in_progress"}'
curl -s -X PUT $API/tasks/1/due-date -H "$AUTH" -H "$JSON" -d "{\"dueDate\":\"2026-09-30\",\"today\":\"$TODAY\"}"
```

Con `{"dueDate": null}` (y `today`) se retira la fecha. Sin el encabezado `Authorization`, cualquiera de estas rutas responde `401`.

### Tests

```bash
cd backend
npm test                                  # toda la suite
node ace test functional --files=<nombre> # un fichero
node ace test --tests="<título>"          # un test por título
```

- **`tasks` no tiene todavía ningún test.** Los que hay son los de `auth` en [`backend/tests/functional/auth/`](../../../backend/tests/functional/auth/). Los de `tasks` irían en `backend/tests/functional/tasks/` (la suite `functional` de [`adonisrc.ts`](../../../backend/adonisrc.ts) recoge `tests/functional/**/*.spec.ts`) y pueden seguir el estilo de los de `auth`.
- **La suite usa la misma base que el servidor de desarrollo**, así que cada grupo aísla con `group.each.setup(() => testUtils.db().withGlobalTransaction())`. Sin eso, los tests ensucian tus datos locales.
- **Si el servidor de desarrollo está arrancado en el 3333, la suite falla con `EADDRINUSE`**, porque levanta su propio servidor HTTP. Se evita con otro puerto: `PORT=3398 npm test`.
- Antes de dar algo por bueno: `npm run lint` y `npm run typecheck` en `backend/`, y `npm run build` y `npm run lint` en `frontend/`.
