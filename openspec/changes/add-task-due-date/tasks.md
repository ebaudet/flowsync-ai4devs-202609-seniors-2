# Tasks

> Sin tests de ningún tipo (petición expresa). La verificación de cada tarea es un comando, una petición `.http` o un comportamiento observable en la app.

## 1. Persistencia de la fecha (FS-118.1)

- [ ] 1.1 Crear la migración `alterTable('tasks')` con `due_date` (`date`, nullable) y `down()` que la elimine; verificar con `node ace migration:run` sobre la base actual (con tareas) y con `node ace migration:rollback` + `migration:run` que ambos sentidos terminan sin error
- [ ] 1.2 Añadir en `database/schema_rules.ts` la regla de `tasks.due_date` como `string | null` con `@column()` plano; verificar que `database/schema.ts` se regenera con `declare dueDate: string | null` y se commitea sin edición manual
- [ ] 1.3 Verificar que las tareas previas siguen válidas: `GET /api/v1/tasks` devuelve las existentes sin error (lo comprueba el `.http` de la tarea 3.5)

## 2. Regla y día de referencia (FS-118.2)

- [ ] 2.1 Añadir `isOverdueOn(today: string)` al modelo `Task` con la regla `dueDate !== null && dueDate < today && status !== 'done'`; verificar con `npm run typecheck` y revisando que no existe ninguna otra copia de la condición (`grep -rn "isOverdue" backend/app frontend/src` solo muestra usos, no reimplementaciones)
- [ ] 2.2 Crear con `node ace make:service` la función `resolveReferenceDay(request)`: cabecera `X-Client-Date` válida y real → ese día; ausente → día UTC del servidor; mal formada o inexistente → 422 con el formato de error de VineJS sobre el campo `X-Client-Date`; verificar con peticiones `.http` (válida, ausente, `ayer`, `2026-02-30`)
- [ ] 2.3 Añadir el helper `withReferenceDay` que deje el día en `$extras.referenceDay` del recurso (uno o varios) y hacer que `TaskTransformer` añada `dueDate` (vía `pick`) e `isOverdue` llamando a `isOverdueOn`, fallando si falta el día; verificar con `npm run typecheck` y que una respuesta de `GET /tasks` trae ambos campos en cada tarea

## 3. API de tareas (FS-118.3)

- [ ] 3.1 Reescribir `app/validators/task.ts`: constructor `dueDate()` (regex `YYYY-MM-DD` + día real con luxon), `createTaskValidator` con `dueDate` nullable/opcional y `updateTaskValidator` con `status` y `dueDate` opcionales; verificar con `.http` que `2026-02-30`, `2026-10`, `15/10/2026`, `2026-10-15T10:00:00Z`, `20261015` y `true` dan 422 sobre `dueDate`
- [ ] 3.2 Añadir `show` a `TasksController` (`findOrFail` + `load('assignee')` + día de referencia) y la ruta `router.get(':id', [controllers.Tasks, 'show'])` en el grupo `tasks`; verificar con `.http`: 200 con la forma de la lista, 404 para un id inexistente, 401 sin token
- [ ] 3.3 Ampliar `store` para aceptar `dueDate` y `update` para aplicar solo las claves presentes (`'dueDate' in payload`; `null` y `""` la quitan; ausente no la toca), con 422 `required` si no hay ni `status` ni `dueDate`, y resolver el día de referencia antes de escribir; verificar con `.http`: crear con y sin fecha, fecha pasada (nace con `isOverdue: true`), poner/cambiar/quitar con `null` y con `""`, estado y fecha a la vez, cuerpo vacío y `isOverdue` enviado (ignorado / 422 si es lo único)
- [ ] 3.4 Verificar la regla de extremo a extremo con `.http` y dos valores de `X-Client-Date`: ayer / hoy / mañana / sin fecha / `done` con fecha pasada, y volver de `done` a `pending` con fecha pasada; comprobar que `isOverdue` cambia solo con la cabecera
- [ ] 3.5 Crear `http/tasks-fecha-vencimiento.http` con las peticiones de 3.1 a 3.4 (mismo estilo que `tasks-cambio-de-estado.http`) y actualizar `http/tasks-rutas-inexistentes.http` y `http/tasks-validacion-titulo.http` si alguna petición presupone «sin lectura individual» o «solo status»; verificar ejecutándolas contra `npm run dev`
- [ ] 3.6 Regenerar `.adonisjs/` arrancando el servidor, commitear el diff si lo hay y dejar `npm run lint`, `npm run format` y `npm run typecheck` en verde en `backend/`
- [ ] 3.7 Actualizar la tabla de rutas y las notas de `CLAUDE.md` (`GET /api/v1/tasks/:id`, `dueDate`/`isOverdue`, cabecera `X-Client-Date`) y verificar que la tabla coincide con `node ace list:routes`

## 4. Frontend (FS-118.4)

- [ ] 4.1 En `lib/types.ts` añadir `dueDate: string | null` e `isOverdue: boolean` a `Task` y corregir el comentario «sin fechas»; verificar con `npm run build`
- [ ] 4.2 En `lib/api.ts`: cabecera `X-Client-Date` con el día **local** en todas las peticiones de tareas, `getTask`, `updateTaskDueDate` (`null` para quitar), `FIELD_LABELS.dueDate`, el mensaje «Introduce una fecha válida.» para un 422 de `dueDate` y el caso 404 («No se encontró la tarea.»); verificar en las herramientas del navegador que las peticiones llevan la cabecera con el día local y que un 422 de fecha se traduce
- [ ] 4.3 Crear `pages/task-page.tsx` y registrar `/tasks/:id` dentro de `ProtectedRoute` en `routes/app-routes.tsx`, con estados cargando / no encontrada / error y enlace «Volver a la lista»; verificar abriendo una tarea existente, una inexistente (`/tasks/9999`) y sin sesión (redirige a login)
- [ ] 4.4 Implementar en la página el campo `<Input type="date">` con `Label`, autoguardado solo con fecha completa, botón «Quitar fecha» sin confirmación, bloqueo mientras hay un cambio en vuelo, error bajo el campo con `field-error.tsx` y vuelta a la fecha guardada si falla; verificar a mano: poner, cambiar, quitar, recargar (persiste), fecha pasada (se acepta), borrar el campo a medias (no envía nada) y un fallo del servidor (revierte con aviso)
- [ ] 4.5 Mostrar la señal «Vencida» (icono + texto, `role="status"`) leyendo solo `task.isOverdue` de la respuesta del servidor; verificar a mano: fecha de ayer → aparece; fecha de hoy y fecha futura → no; tarea `done` con fecha pasada → no; quitar o aplazar la fecha → desaparece sin recargar; uso con teclado
- [ ] 4.6 Convertir el título de `TaskRow` en un enlace a `/tasks/:id` sin mostrar fecha ni marca; verificar que la lista con tareas vencidas y con fecha sigue mostrando solo título, responsable y estado, y que el formulario de creación no cambia (sin campo de fecha)
- [ ] 4.7 Dejar `npm run lint`, `npm run format` y `npm run build` (typecheck) en verde en `frontend/`

## 5. Cierre

- [ ] 5.1 Revisión manual de los escenarios de la spec delta con backend y frontend arrancados (cambio de día de referencia simulado con `X-Client-Date`) y anotar cualquier desviación antes de abrir el PR
- [ ] 5.2 Cerrar según las reglas del repo: `/commit`, `gh pr create` con la descripción completa de los cambios y pasar el subagente `adversarial-reviewer` sobre el PR; verificar que existe la URL del PR
