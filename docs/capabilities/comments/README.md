# Capability: `comments`

El hilo de comentarios de cada tarea: apuntar una aclaración o una novedad junto a la tarea sin tocar
su título, su estado ni su responsable.

> **Dónde está la verdad.** Las reglas de esta capability viven en
> **[`openspec/specs/comments/spec.md`](../../../openspec/specs/comments/spec.md)** y este README **no
> las repite**: enlaza a cada una y dice dónde está implementada. Lo que sí describe de primera mano
> es lo que se lee del código. Si algo de aquí y la spec no concuerdan, manda la spec (ver
> [ADR 0001](../../adr/0001-openspec-como-fuente-de-verdad.md)).
>
> **Alcance de hoy.** Solo está implementada la **escritura** (tres de los cuatro requisitos de la
> spec). El requisito *Leer los comentarios de una tarea* (`GET /tasks/:id/comments`) **no está
> implementado**: no hay ruta ni método de lectura.

## Endpoints

Bajo `/api/v1`, declarado en [`backend/start/routes.ts`](../../../backend/start/routes.ts) dentro del
grupo `tasks`, que lleva `.use(middleware.auth())`: exige `Authorization: Bearer <token>`.

| Método y ruta | Entrada | Controlador | Devuelve |
|---|---|---|---|
| `POST /tasks/:id/comments` | `{ "body": "..." }` | [`CommentsController.store`](../../../backend/app/controllers/comments_controller.ts) | `201` · el comentario creado |

La respuesta va envuelta en `{ "data": ... }` por el serializer de
[`providers/api_provider.ts`](../../../backend/providers/api_provider.ts). El comentario sale por
[`CommentTransformer`](../../../backend/app/transformers/comment_transformer.ts):

```json
{ "data": { "id": 1, "body": "Falta el informe del trimestre", "createdAt": "...",
            "author": { "id": 1, "fullName": "Ada Lovelace", "initials": "AL" } } }
```

El `author` sale por
[`TaskAssigneeTransformer`](../../../backend/app/transformers/task_assignee_transformer.ts), que lo
recorta a `id`, `fullName` e `initials`: nunca el email.

### Orden de las comprobaciones

El orden es parte del contrato:

1. Sin token válido: `401` (middleware `auth`), y no se crea nada.
2. La tarea no existe, o está en la papelera: `404` (`Task.findOrFail`), **antes** de mirar el cuerpo.
   Con un cuerpo inválido sobre una tarea inexistente sigue siendo `404`.
3. El cuerpo no es válido: `422` sobre `body`.
4. El texto repite el último comentario de esa cuenta en esa tarea: `422` sobre `body`.

Los `422` salen con la forma de los de VineJS, `{ "errors": [{ "message", "rule", "field": "body" }] }`.
Una petición rechazada no crea ninguna fila.

### El contrato, servido

La operación está anotada con los decoradores de `@foadonis/openapi` sobre el controlador, así que el
documento servido en **`/api.json`** (y la interfaz en `/api`) lleva el cuerpo y los códigos
`201`/`401`/`404`/`422`. Los esquemas `Comment`, `CommentResponse` y `CreateCommentBody` viven en
[`backend/app/openapi/schemas.ts`](../../../backend/app/openapi/schemas.ts). Hay además una copia
versionada del documento en [`docs/api/openapi.json`](../../api/openapi.json), que se regenera con
`npm run openapi:generate` desde `backend/` y se comprueba con `npm run openapi:check`.

## Reglas de negocio: dónde vive cada una

Esta tabla dice **dónde se cumplen** y **qué requisito las manda**, no qué exigen.

| Área | Implementada en | Requisito que manda |
|---|---|---|
| Crear un comentario a nombre de quien envía | `CommentsController.store`: el autor sale de `auth.getUserOrFail()`; el validador solo declara `body`, así que `author`, `authorId` y `author_id` del cuerpo se ignoran | [Comentar una tarea](../../../openspec/specs/comments/spec.md#requirement-comentar-una-tarea) |
| Comentar no cambia la tarea | `store` solo escribe en `comments`; no guarda la tarea | [Comentar una tarea](../../../openspec/specs/comments/spec.md#requirement-comentar-una-tarea) |
| Tarea inexistente o en la papelera: 404 antes del cuerpo | `Task.findOrFail` primero en `store`; los hooks de `Task` ocultan la papelera | [Comentar una tarea](../../../openspec/specs/comments/spec.md#requirement-comentar-una-tarea) |
| Sesión obligatoria | `.use(middleware.auth())` sobre el grupo `tasks` · `start/routes.ts` | [Comentar una tarea](../../../openspec/specs/comments/spec.md#requirement-comentar-una-tarea) |
| Ni vacío ni excesivo; espacios de los extremos no cuentan | `createCommentValidator` · [`validators/comment.ts`](../../../backend/app/validators/comment.ts): `trim()` antes de `minLength(1)` y `maxLength(500)`; pasarse es un `422`, nunca un recorte | [Ningún comentario vacío ni excesivo](../../../openspec/specs/comments/spec.md#requirement-ningún-comentario-vacío-ni-excesivo) |
| Un mismo comentario no se repite seguido | `CommentService.create` · [`services/comment_service.ts`](../../../backend/app/services/comment_service.ts): **único sitio de la regla**. Compara el texto recortado con el último comentario (`id` más alto) de esa cuenta en esa tarea y, si es idéntico, lanza un `E_VALIDATION_ERROR` de VineJS sobre `body` | [Un mismo comentario no se repite seguido](../../../openspec/specs/comments/spec.md#requirement-un-mismo-comentario-no-se-repite-seguido) |
| Leer los comentarios de una tarea | **Sin implementar** | [Leer los comentarios de una tarea](../../../openspec/specs/comments/spec.md#requirement-leer-los-comentarios-de-una-tarea) |

### Decisiones de datos

Migración [`create_comments_table`](../../../backend/database/migrations/1795715692238_create_comments_table.ts),
modelo [`Comment`](../../../backend/app/models/comment.ts) (solo relaciones `task` y `author`):

- **`task_id` → `tasks`, `ON DELETE CASCADE`.** La papelera solo marca `tasks.deleted_at`: la fila
  sigue existiendo y los comentarios se conservan para cuando se restaure. El `CASCADE` solo actúa si
  un borrado físico de verdad se lleva la tarea, y entonces no deben quedar huérfanos.
- **`author_id` → `users`, `ON DELETE CASCADE`**, igual que `tasks.assignee_id`. Es una decisión de
  negocio revisable: `RESTRICT` impediría borrar a quien haya comentado, y `SET NULL` exigiría un
  autor nulo que el contrato no admite.
- **Índice `(task_id, author_id, id)`** para la consulta de la regla de no repetición, «el último
  comentario de esta cuenta en esta tarea» (igualdad en las dos primeras columnas, orden por `id`).
  Su prefijo `task_id` sirve también para el hilo de una tarea.
- **Concurrencia.** `CommentService.create` comprueba y escribe en una transacción con un
  `pg_advisory_xact_lock(task_id, author_id)`: dos envíos simultáneos de la misma cuenta a la misma
  tarea se serializan y el segundo ve el primero.

## Datos y pruebas

- Factory: [`CommentFactory`](../../../backend/database/factories/comment_factory.ts), con texto en
  castellano de 1 a 500 caracteres y fechas coherentes.
- Seeder de desarrollo: [`comment_seeder.ts`](../../../backend/database/seeders/comment_seeder.ts).
  Idempotente y autosuficiente (crea cuentas y tareas si la base está vacía); deja hilos de 2 a 5
  comentarios en 8 tareas, de varias cuentas y sin repetir seguido el mismo texto. Se lanza con
  `make seed` (que corre todos los seeders; cada uno solo actúa en `development`).
- Tests de contrato:
  [`backend/tests/functional/comments/create.spec.ts`](../../../backend/tests/functional/comments/create.spec.ts),
  un test por scenario de los tres requisitos de escritura (11). Los del requisito de lectura no
  existen porque la lectura no está implementada.

```bash
cd backend && node ace test --files=comments    # o `make test` desde la raíz
```
