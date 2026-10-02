# Proposal

## Why

FlowSync existe para responder «quién está en qué» sin interrumpir a nadie, pero hoy solo existe la capability de cuentas y acceso: no hay ninguna entidad de negocio más allá del usuario. Sin una lista compartida de tareas con responsable y estado a la vista, no hay producto que usar; es el sustrato del que depende el resto del backlog (E3-1 va el primero del orden priorizado).

## What Changes

Se da de alta la capability de tareas del equipo, full-stack, con cinco historias del backlog: **E3-1** lista compartida, **E2-1** crear tarea con solo el título, **E2-2** título obligatorio, **E2-3** nace mía y pendiente y **E2-4** cambiar el estado desde la lista.

- **API (`backend/`)**: exactamente tres operaciones bajo `/api/v1/tasks`, todas protegidas con sesión: listar todas las tareas, crear una y actualizarla. La actualización acepta únicamente el estado. No hay lectura individual, borrado ni endpoints de equipo.
- **Estados**: conjunto cerrado `pending`, `in_progress`, `done` en la API; la interfaz los pinta como Pendiente, En curso y Hecho. Cualquier otro valor se rechaza con 422.
- **Creación**: el título es lo único que se pide. La tarea nace en `pending` y con quien la crea como responsable; cualquier otro dato enviado se ignora. Un título vacío o en blanco se rechaza con 422; uno de más de 255 caracteres se rechaza con aviso, nunca se recorta.
- **Lista compartida**: una sola lista, idéntica para todas las personas con sesión; cualquiera puede cambiar el estado de cualquier tarea. El responsable se expone y se pinta por su nombre ("Sin nombre" si no tiene), nunca por su correo ni su id.
- **Interfaz (`frontend/`)**: nueva pantalla de tareas con formulario de un solo campo, estado vacío con salida y control de estado en cada fila, reutilizando los componentes de `components/ui/` y el patrón de páginas y rutas del login. Sin dependencias nuevas.
- **Navegación (modifica `auth`)**: la lista pasa a ser la portada. Tras iniciar sesión o registrarse, y desde cualquier dirección desconocida, se llega a la lista en lugar del perfil; el perfil sigue existiendo y se enlaza desde la lista y de vuelta.

Restricciones de este change, no negociables:

1. La tarea **no tiene fecha de vencimiento**, ni la lista muestra fechas ni marcas de vencida; tampoco se deja nada preparado para ello.
2. **Sin tests**: ni base de pruebas ni ficheros de test; la verificación es por typecheck, lint, build y comprobación manual.
3. El formulario de creación **no ofrece ni sugiere** responsable, estado ni fecha.
4. **No hay regla de orden**: la lista no se ordena de forma explícita (ver Puntos abiertos).
5. **No hay tareas privadas ni vista «mis tareas»**.

## Capabilities

### New Capabilities
- `tasks`: la lista compartida de tareas del equipo: listar, crear con solo el título, validación del título, responsable y estado por defecto, y cambio de estado de cualquier tarea.

### Modified Capabilities
- `auth`: cambia el destino de las redirecciones de la aplicación web (tras iniciar sesión o registrarse, desde direcciones desconocidas y desde pantallas solo para visitantes pasa a ser la lista de tareas en lugar del perfil) y el perfil enlaza de vuelta a la lista.

## Puntos abiertos

Decisiones de producto sin tomar que este change **no resuelve ni inventa**:

- **Orden de la lista (PA-3).** No hay criterio de ordenación ni de agrupación por persona: la API no ordena explícitamente y la interfaz muestra las tareas en el orden en que llegan. El orden resultante no es una garantía de comportamiento: una tarea recién creada se añade al final de la lista en pantalla y, tras recargar, puede aparecer en otro sitio. Sin él, la promesa de E3-1 CA-5 («enumerar el trabajo de cada persona») no se sostiene con volumen.
- **Transiciones de estado (PA-7).** Se admite pasar de cualquier estado a cualquiera de los tres, incluido volver atrás desde Hecho, porque ningún requisito declara un grafo. Cambiar a Hecho no pide confirmación.
- **Umbral del título (PA-9).** La frontera de 255 caracteres es un valor de ingeniería elegido para poder avisar en lugar de recortar (E2-2 CA-3, criterio PROPUESTO), no una decisión de producto.
- **Reasignar el responsable.** Queda fuera (E2-7): el responsable se fija al crear y esta versión de la API no permite cambiarlo. Los criterios de «cualquier persona puede cambiar el responsable de cualquier tarea» se cubren cuando exista esa historia y un modo de identificar a las personas, que hoy ningún endpoint ofrece.
- **Responsables indistinguibles.** Al identificar al responsable solo por su nombre, dos personas con el mismo nombre, o varias sin nombre ("Sin nombre"), no se distinguen en la lista. Es consecuencia de la restricción y no se resuelve aquí (E3-1 CA-5 y CA-6).
- **Lista que se refresca sola (E3-2) y número de tareas En curso por persona (PA-4):** fuera de alcance.

## Impact

- **Backend**: nueva tabla de tareas y su migración (con regeneración de `database/schema.ts`); nuevo modelo, validadores, transformer y controlador; tres rutas nuevas en `start/routes.ts`; actualización del código generado versionado en `.adonisjs/`.
- **Frontend**: nuevas llamadas en `lib/api.ts`, nueva página y componentes de tareas, ruta protegida nueva y cambios de destino en los guards y en el perfil. Sin dependencias nuevas.
- **Specs**: nueva spec `tasks` y delta sobre `auth`.
- **Documentación**: la tabla de rutas de `CLAUDE.md` se actualiza con las tres nuevas.
- **Fuera de alcance**: tests, fechas de vencimiento, borrado, edición de título, reasignación, filtros, abrir tarea, refresco automático y cualquier señal de presencia.
