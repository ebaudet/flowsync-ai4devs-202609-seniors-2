# Proposal

## Why

FS-118 (RF-13, RF-14, RF-15 del PRD): una tarea debe poder comprometerse con una fecha solo cuando de verdad existe, y quien la abre debe ver sin cálculo mental si se ha pasado de plazo. Hoy la spec `tasks` declara expresamente lo contrario («las tareas no tienen fecha de vencimiento»), así que este change la invierte de forma deliberada y acotada.

## What Changes

- **Fecha de vencimiento opcional** en cada tarea: un día de calendario (`YYYY-MM-DD`), sin hora. Las tareas existentes quedan sin fecha.
- **Campo `dueDate`** (`string | null`) e **`isOverdue`** (booleano) en la representación de una tarea, en todas las respuestas que la devuelven (lista, lectura, creación y actualización).
- **Regla de vencimiento, decidida por el backend en cada lectura** y sin persistirse: vencida ⇔ tiene fecha **y** la fecha es anterior a hoy **y** el estado no es `done`. Una tarea con fecha de hoy no está vencida; una tarea `done` nunca lo está.
- **El día de referencia es el de quien mira**: el cliente lo envía en la cabecera `X-Client-Date: YYYY-MM-DD`; si falta, el servidor usa su día UTC; si viene mal formada, 422.
- **Poner, cambiar y quitar la fecha** con `PATCH /api/v1/tasks/:id` (`dueDate`); quitarla es enviarla explícitamente vacía (`null` o `""`). `status` y `dueDate` pasan a ser opcionales en el cuerpo, con al menos uno obligatorio. Una fecha anterior a hoy se acepta. Una fecha inexistente o incompleta se rechaza con 422 sobre `dueDate`.
- **`POST /api/v1/tasks` acepta `dueDate` opcional** (con las mismas reglas). El formulario de creación del frontend **no cambia**: sigue sin ofrecerla.
- **`isOverdue` no es entrada**: si el cliente lo envía, se ignora.
- **Nueva lectura individual** `GET /api/v1/tasks/:id` (superficie mínima que la historia necesita para «abrir la tarea»).
- **Frontend**: ruta mínima `/tasks/:id` con título, campo de fecha, «Quitar fecha» y la señal «Vencida» (texto + icono, no solo color); el título de cada fila de la lista pasa a ser un enlace a ella. La lista **no muestra** fecha ni marca de vencida.
- **BREAKING (dentro de la spec, no para clientes)**: se elimina el requisito «Las tareas no tienen fecha de vencimiento» y se reescriben los que lo presuponían (forma de la tarea, tres operaciones, sin lectura individual, `status` obligatorio en el PATCH).

Fuera de alcance: notificaciones, recordatorios, recurrencia, ordenar o filtrar por fecha, la pantalla de detalle completa (PA-6), reasignación, edición del título y tests de cualquier tipo.

## Capabilities

### New Capabilities

Ninguna: todo el comportamiento pertenece a la capability de tareas ya existente.

### Modified Capabilities

- `tasks`: se añade la fecha de vencimiento y la regla de tarea vencida (`dueDate`, `isOverdue`, día de referencia de quien consulta); se añade la lectura individual y el PATCH admite `dueDate`; se elimina el requisito que prohibía la fecha y se reescriben los de listado, lista única, creación, estados cerrados, operaciones y protección; se añade la ruta mínima `/tasks/:id` en el frontend.

## Impact

- **Backend**: migración nueva sobre `tasks` (columna nullable), `database/schema.ts` regenerado (no se edita), `database/schema_rules.ts`, `app/models/task.ts` (regla de vencimiento), `app/validators/task.ts`, `app/controllers/tasks_controller.ts` (método `show`, `store`/`update` ampliados), `app/transformers/task_transformer.ts`, `start/routes.ts`, `.adonisjs/` regenerado y commiteado, ficheros `http/*.http` de prueba manual.
- **Frontend**: `lib/types.ts`, `lib/api.ts` (cabecera `X-Client-Date`, `getTask`, `updateTaskDueDate`, mensajes de `dueDate`), `routes/app-routes.tsx`, `components/task-row.tsx` (enlace), página y componentes nuevos para `/tasks/:id`. Sin dependencias nuevas.
- **Datos**: la base de desarrollo es el único fichero SQLite; migrar toca también el estado local.
- **Sin tests** por petición expresa; la verificación es manual con los `.http` y la app, además de lint, formato y typecheck.
