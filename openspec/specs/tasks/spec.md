# tasks Specification

## Purpose

Mantiene una única lista compartida con las tareas del equipo, de modo que cualquier persona con sesión pueda ver en qué anda cada cual, anotar una tarea con solo su título y mantener al día su estado.

## Requirements

### Requirement: Listado de tareas

El sistema SHALL responder a `GET /api/v1/tasks` con todas las tareas existentes en `data`, cada una con `id`, `title`, `status`, `dueDate`, `isOverdue` y `assignee`, donde `assignee` contiene únicamente el nombre del responsable en `fullName`.

#### Scenario: Lista con tareas

- **WHEN** una persona con sesión envía `GET /api/v1/tasks` y existen tres tareas
- **THEN** la respuesta es 200 y `data` contiene las tres, cada una con `id`, `title`, `status`, `dueDate`, `isOverdue` y `assignee.fullName`

#### Scenario: Responsable sin nombre

- **WHEN** se lista una tarea cuyo responsable no tiene nombre
- **THEN** su `assignee.fullName` es `null`

#### Scenario: El responsable no revela datos de cuenta

- **WHEN** se lista cualquier tarea
- **THEN** el objeto `assignee` no contiene ni el email ni el identificador del responsable, ni ningún otro dato de su cuenta

#### Scenario: Sin tareas

- **WHEN** una persona con sesión envía `GET /api/v1/tasks` y no se ha creado ninguna tarea
- **THEN** la respuesta es 200 y `data` es una lista vacía

#### Scenario: Consultar no modifica nada

- **WHEN** se envía `GET /api/v1/tasks` varias veces seguidas
- **THEN** ninguna tarea cambia de título, estado, responsable ni fecha

#### Scenario: Forma de la tarea

- **WHEN** se lista, se lee, se crea o se actualiza una tarea
- **THEN** su representación contiene solo `id`, `title`, `status`, `dueDate`, `isOverdue` y `assignee`, sin ningún otro campo de fecha como las marcas de creación o modificación

### Requirement: Lista única compartida

El sistema SHALL mantener una única lista de tareas, idéntica para todas las personas con sesión, sin tareas privadas, sin lista por persona y sin contenido reservado a ningún rol.

#### Scenario: Dos personas ven lo mismo

- **WHEN** dos personas distintas con sesión envían `GET /api/v1/tasks` sin que nadie modifique nada entre una petición y otra
- **THEN** ambas reciben exactamente el mismo conjunto de tareas

#### Scenario: La tarea de otra persona está en mi lista

- **WHEN** Ada crea una tarea y después Grace envía `GET /api/v1/tasks`
- **THEN** la tarea de Ada figura en la respuesta de Grace, con Ada como responsable

#### Scenario: No existe una vista por persona

- **WHEN** se busca cualquier operación o parámetro para obtener solo las tareas de una persona
- **THEN** no existe: las únicas formas de leer tareas son la lista completa y la lectura de una tarea por su identificador

### Requirement: Creación de una tarea con solo el título

El sistema SHALL crear una tarea cuando reciba `POST /api/v1/tasks` con un `title` válido como único dato necesario, y SHALL responder 201 con la tarea creada en `data`.

#### Scenario: Creación con solo el título

- **WHEN** una persona con sesión envía `POST /api/v1/tasks` con el cuerpo `{"title": "Revisar el despliegue"}`
- **THEN** la respuesta es 201 con `data` que contiene la tarea con ese `title`, y la tarea aparece desde ese momento en `GET /api/v1/tasks`

#### Scenario: Espacios alrededor del título

- **WHEN** se crea una tarea con el `title` "  Revisar el despliegue  "
- **THEN** la tarea se guarda con el título "Revisar el despliegue", sin los espacios de los extremos

#### Scenario: Datos adicionales ignorados

- **WHEN** se envía `POST /api/v1/tasks` con un `title` válido y además `status`, `assignee` o `isOverdue`
- **THEN** la tarea se crea igualmente, pendiente y a nombre de quien la crea, y los datos adicionales no tienen ningún efecto

### Requirement: Responsable y estado por defecto

El sistema SHALL crear cada tarea en estado `pending` y con quien la crea como responsable, sin que la persona deba elegir ninguno de los dos.

#### Scenario: Nace pendiente

- **WHEN** una persona crea una tarea indicando solo el título
- **THEN** la tarea tiene `status` igual a `pending`

#### Scenario: Nace a nombre de quien la crea

- **WHEN** Ada Lovelace crea una tarea indicando solo el título
- **THEN** la tarea tiene `assignee.fullName` igual a "Ada Lovelace"

#### Scenario: Quien crea no tiene nombre

- **WHEN** crea una tarea una persona cuya cuenta no tiene nombre
- **THEN** la tarea se crea a su nombre y su `assignee.fullName` es `null`

### Requirement: Título obligatorio

El sistema SHALL rechazar con 422 la creación de una tarea sin título legible, con un error sobre el campo `title`, y SHALL NOT crear la tarea.

#### Scenario: Título ausente o vacío

- **WHEN** se envía `POST /api/v1/tasks` sin cuerpo, sin `title`, con `title` igual a `null` o con `title` igual a una cadena vacía
- **THEN** la respuesta es 422 con un error de regla `required` sobre `title` y no se crea ninguna tarea

#### Scenario: Título solo con espacios

- **WHEN** se envía `POST /api/v1/tasks` con un `title` formado únicamente por espacios
- **THEN** la respuesta es 422 con un error sobre `title` y no aparece ninguna tarea sin texto en la lista

### Requirement: Límite de longitud del título

El sistema SHALL admitir títulos de hasta 255 caracteres y SHALL rechazar con 422 los más largos, sin guardar nunca una versión recortada.

#### Scenario: Título en el límite

- **WHEN** se crea una tarea con un `title` de exactamente 255 caracteres
- **THEN** la respuesta es 201 y el título se guarda completo

#### Scenario: Título demasiado largo

- **WHEN** se crea una tarea con un `title` de 256 caracteres
- **THEN** la respuesta es 422 con un error de regla `maxLength` sobre `title` y no se crea ninguna tarea, ni siquiera recortada

### Requirement: Cambio de estado de una tarea

El sistema SHALL cambiar el estado de la tarea indicada cuando reciba `PATCH /api/v1/tasks/{id}` con un `status` válido, sea cual sea su responsable, y SHALL responder 200 con la tarea actualizada en `data`.

#### Scenario: Cambio de estado

- **WHEN** una persona con sesión envía `PATCH /api/v1/tasks/{id}` con `{"status": "in_progress"}` sobre una tarea pendiente
- **THEN** la respuesta es 200 con la tarea con `status` igual a `in_progress`, y `GET /api/v1/tasks` la devuelve ya en ese estado

#### Scenario: Tarea de otra persona

- **WHEN** Grace cambia el estado de una tarea cuyo responsable es Ada
- **THEN** el cambio se aplica igual que en una tarea propia, sin ningún error de permisos

#### Scenario: Cualquier transición

- **WHEN** se cambia una tarea de `done` a `pending`, o de `pending` a `done`
- **THEN** el cambio se aplica, porque no hay ninguna transición prohibida entre los tres estados

#### Scenario: El cambio no toca nada más

- **WHEN** se cambia el estado de una tarea
- **THEN** su título y su responsable son los mismos que antes

#### Scenario: Otros datos ignorados

- **WHEN** se envía `PATCH /api/v1/tasks/{id}` con un `status` válido y además un `title` o un `assignee`
- **THEN** solo cambia el estado y los demás datos se ignoran

#### Scenario: Tarea inexistente

- **WHEN** se envía `PATCH /api/v1/tasks/{id}` con un identificador que no corresponde a ninguna tarea
- **THEN** la respuesta es 404

### Requirement: Estados cerrados

El sistema SHALL admitir únicamente los estados `pending`, `in_progress` y `done`, y SHALL rechazar con 422 cualquier otro valor de estado, sin modificar la tarea.

#### Scenario: Valor desconocido

- **WHEN** se envía `PATCH /api/v1/tasks/{id}` con `{"status": "pendiente"}` (o cualquier valor distinto de los tres)
- **THEN** la respuesta es 422 con un error sobre el campo `status` y la tarea conserva su estado

#### Scenario: Estado ausente

- **WHEN** se envía `PATCH /api/v1/tasks/{id}` sin cuerpo, o sin `status` ni `dueDate`, o con `status` igual a `null` o vacío y sin `dueDate`
- **THEN** la respuesta es 422 con un error de regla `required` y la tarea no se modifica

#### Scenario: Los tres valores válidos

- **WHEN** se envía `PATCH /api/v1/tasks/{id}` con `pending`, con `in_progress` o con `done`
- **THEN** cada petición responde 200 y la tarea queda exactamente en el estado enviado

### Requirement: Operaciones de la API de tareas

El sistema SHALL ofrecer exactamente cuatro operaciones sobre tareas (listar, leer una, crear y actualizar estado o fecha), y SHALL NOT ofrecer borrado ni operaciones de equipo.

#### Scenario: Sin lectura individual

- **WHEN** se envía `GET /api/v1/tasks/{id}` con un identificador de una tarea existente
- **THEN** la respuesta es 200 con la tarea: la lectura individual forma parte de las operaciones ofrecidas

#### Scenario: Sin borrado

- **WHEN** se envía `DELETE /api/v1/tasks/{id}` con un identificador de una tarea existente
- **THEN** la respuesta es 404 y la tarea sigue en la lista

### Requirement: Protección de la API de tareas

El sistema SHALL responder 401 con el mensaje "Unauthorized access" a cualquier petición de listar, leer, crear o actualizar tareas que no lleve un token vigente en formato Bearer, sin crear ni modificar nada.

#### Scenario: Sin sesión

- **WHEN** se envía `GET /api/v1/tasks`, `GET /api/v1/tasks/{id}`, `POST /api/v1/tasks` o `PATCH /api/v1/tasks/{id}` sin cabecera `Authorization`
- **THEN** la respuesta es 401 con el mensaje "Unauthorized access", no se devuelve ninguna tarea y no se crea ni se modifica ninguna

#### Scenario: Token cerrado

- **WHEN** se envía `GET /api/v1/tasks` con un token de una sesión ya cerrada
- **THEN** la respuesta es 401

### Requirement: Pantalla de la lista de tareas

La aplicación SHALL mostrar en `/tasks` a la persona con sesión abierta una sola lista con todas las tareas del equipo, y en cada fila su título, su responsable por nombre y su estado, de modo que no haga falta abrir nada para saberlo.

#### Scenario: Cada fila dice título, responsable y estado

- **WHEN** una persona con sesión abre `/tasks` y hay una tarea "Revisar el despliegue" a nombre de Ada Lovelace en estado En curso
- **THEN** ve en una misma fila el título "Revisar el despliegue", el nombre "Ada Lovelace" y el estado "En curso"

#### Scenario: Responsable sin nombre

- **WHEN** una tarea tiene como responsable a una persona sin nombre
- **THEN** la fila muestra "Sin nombre" como responsable, y nunca su email ni su identificador

#### Scenario: Nombres de los estados

- **WHEN** hay tareas en los estados `pending`, `in_progress` y `done`
- **THEN** la interfaz los muestra como "Pendiente", "En curso" y "Hecho", y en ningún caso con los identificadores de la API

#### Scenario: Sin fechas ni marcas de vencida

- **WHEN** una persona recorre la lista
- **THEN** no ve fecha alguna en ninguna fila ni ninguna marca de tarea vencida

#### Scenario: Una sola lista

- **WHEN** una persona busca otras vistas de tareas en la aplicación
- **THEN** no hay ninguna vista «mis tareas» ni filtro por persona, y no ve ninguna señal de quién está conectado

#### Scenario: Acceso al perfil

- **WHEN** una persona con sesión mira la cabecera de `/tasks`
- **THEN** ve un enlace "Mi perfil" que lleva a `/profile`, desde donde puede cerrar sesión

#### Scenario: Mirar no cambia nada

- **WHEN** una persona abre `/tasks` y recorre la lista
- **THEN** ninguna tarea cambia de estado ni de responsable

### Requirement: Carga de la lista

La aplicación SHALL indicar que la lista se está cargando y SHALL mostrar un aviso de error en castellano, sin tareas, cuando no pueda obtenerla.

#### Scenario: Cargando

- **WHEN** una persona abre `/tasks` y el servidor aún no ha respondido
- **THEN** ve un indicador de carga en lugar de la lista, y no el estado vacío

#### Scenario: Servidor inaccesible

- **WHEN** una persona abre `/tasks` y el servidor no responde
- **THEN** ve el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado." y no ve ninguna tarea, ni el estado vacío, ni el formulario de creación

#### Scenario: Error del servidor al cargar

- **WHEN** una persona abre `/tasks` y el servidor responde con un error interno
- **THEN** ve el aviso "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento." y no ve ninguna tarea ni el estado vacío

#### Scenario: Sesión caducada al cargar

- **WHEN** una persona abre `/tasks` y el servidor rechaza su sesión
- **THEN** ve el aviso "Tu sesión ha caducado. Vuelve a iniciar sesión." y no ve ninguna tarea

### Requirement: Estado vacío de la lista

La aplicación SHALL explicar qué es la lista y ofrecer crear la primera tarea cuando no haya ninguna, en lugar de mostrar una lista vacía sin más.

#### Scenario: Espacio sin tareas

- **WHEN** una persona abre `/tasks` y no existe ninguna tarea
- **THEN** ve un texto que explica que ahí aparecerán las tareas del equipo y el formulario para crear la primera

#### Scenario: Deja de estar vacía

- **WHEN** esa persona crea la primera tarea
- **THEN** el texto de estado vacío desaparece y la tarea figura en la lista

### Requirement: Formulario de creación de tareas

La aplicación SHALL ofrecer en `/tasks` un formulario con un único campo "Título" y un botón "Crear tarea", sin ofrecer ni sugerir responsable, estado ni fecha, y SHALL mostrar la tarea creada en la lista sin recargar la página.

#### Scenario: Un título basta

- **WHEN** una persona escribe un título y pulsa "Crear tarea"
- **THEN** la tarea aparece en la lista sin recargar ni cambiar de pantalla, pendiente y con su nombre como responsable, y el campo queda vacío para anotar otra

#### Scenario: Nada más que pedir

- **WHEN** una persona recorre el formulario de creación
- **THEN** el título es lo único que se le pide y no ve ningún selector, valor sugerido ni campo de responsable, estado o fecha

#### Scenario: Título vacío o en blanco

- **WHEN** una persona pulsa "Crear tarea" con el campo vacío o con solo espacios
- **THEN** ve bajo el campo "Título" el mensaje "Falta rellenar el título.", no se crea ninguna tarea y la lista no cambia

#### Scenario: Título demasiado largo

- **WHEN** una persona pulsa "Crear tarea" con un título de más de 255 caracteres
- **THEN** ve bajo el campo un mensaje en castellano que indica el límite de 255 caracteres, el texto escrito se conserva completo en el campo y no se crea ninguna tarea

#### Scenario: Envío en curso

- **WHEN** una persona pulsa "Crear tarea" y el servidor aún no ha respondido
- **THEN** el botón queda deshabilitado hasta que llega la respuesta

#### Scenario: Error del servidor al crear

- **WHEN** el servidor no responde o responde con un error al crear una tarea
- **THEN** ve un aviso de error en castellano, conserva el título escrito y puede reintentarlo

### Requirement: Cambio de estado desde la lista

La aplicación SHALL permitir cambiar el estado de cualquier tarea desde su propia fila con un solo gesto, sin abrir la tarea, sin diálogo de confirmación y sin rellenar ningún campo, ofreciendo como únicos destinos Pendiente, En curso y Hecho.

#### Scenario: Un gesto desde la fila

- **WHEN** una persona pulsa "Hecho" en la fila de una tarea pendiente
- **THEN** la fila muestra "Hecho" como estado de inmediato, sin que se abra la tarea ni aparezca ningún diálogo de confirmación

#### Scenario: Los tres destinos

- **WHEN** una persona mira los controles de estado de una fila
- **THEN** ve exactamente "Pendiente", "En curso" y "Hecho", con el estado actual destacado, y no existe ninguna forma de añadir, renombrar o eliminar un estado

#### Scenario: Tarea de otra persona

- **WHEN** una persona cambia el estado de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica igual que en una propia, sin permiso especial ni advertencia

#### Scenario: El cambio no mueve el responsable

- **WHEN** una persona cambia el estado de una tarea
- **THEN** el responsable que muestra la fila sigue siendo el mismo

#### Scenario: Persiste al recargar

- **WHEN** una persona cambia el estado de una tarea y recarga la página
- **THEN** la tarea sigue en el estado nuevo

#### Scenario: Fallo del servidor

- **WHEN** el servidor no responde o rechaza el cambio de estado
- **THEN** la fila vuelve al estado que tenía, y la persona ve un aviso de error en castellano

### Requirement: Fecha de vencimiento opcional

El sistema SHALL permitir que cada tarea tenga una fecha de vencimiento opcional, expuesta como `dueDate` con el formato `YYYY-MM-DD` (un día de calendario, sin hora) o `null` cuando no la tiene, y SHALL crear las tareas sin fecha por defecto.

#### Scenario: Tarea sin fecha

- **WHEN** se crea una tarea indicando solo el título
- **THEN** la tarea tiene `dueDate` igual a `null`

#### Scenario: Tareas anteriores al cambio

- **WHEN** se lista una tarea que existía antes de que se introdujera la fecha de vencimiento
- **THEN** su `dueDate` es `null` y la tarea sigue siendo válida

#### Scenario: Sin hora

- **WHEN** se fija la fecha "2026-10-15" a una tarea y se vuelve a leer
- **THEN** `dueDate` es exactamente "2026-10-15", sin hora ni huso, para cualquier persona que la lea

### Requirement: Poner, cambiar y quitar la fecha

El sistema SHALL poner, cambiar o quitar la fecha de la tarea indicada cuando reciba `PATCH /api/v1/tasks/{id}` con `dueDate`, sea cual sea su responsable, y SHALL responder 200 con la tarea actualizada. Quitarla se hace enviando `dueDate` explícitamente vacío (`null` o cadena vacía); omitirlo no la toca.

#### Scenario: Poner una fecha

- **WHEN** una persona con sesión envía `PATCH /api/v1/tasks/{id}` con `{"dueDate": "2026-10-15"}` sobre una tarea sin fecha
- **THEN** la respuesta es 200 con `dueDate` igual a "2026-10-15" y `GET /api/v1/tasks/{id}` la devuelve con esa fecha

#### Scenario: Cambiar la fecha

- **WHEN** se envía `{"dueDate": "2026-11-01"}` sobre una tarea con fecha "2026-10-15"
- **THEN** la tarea queda con "2026-11-01"

#### Scenario: Quitar la fecha con null

- **WHEN** se envía `{"dueDate": null}` sobre una tarea con fecha
- **THEN** la respuesta es 200, `dueDate` es `null` y `isOverdue` es `false`

#### Scenario: Quitar la fecha con cadena vacía

- **WHEN** se envía `{"dueDate": ""}` sobre una tarea con fecha
- **THEN** la tarea queda sin fecha, igual que con `null`

#### Scenario: Omitir la fecha no la toca

- **WHEN** se envía `{"status": "done"}` sobre una tarea con fecha
- **THEN** la tarea conserva su `dueDate` sin ningún cambio

#### Scenario: Estado y fecha a la vez

- **WHEN** se envía `{"status": "in_progress", "dueDate": "2026-10-15"}`
- **THEN** la respuesta es 200 con ambos cambios aplicados

#### Scenario: Tarea de otra persona

- **WHEN** Grace pone o quita la fecha de una tarea cuyo responsable es Ada
- **THEN** el cambio se aplica sin ningún error de permisos

#### Scenario: Cambiar la fecha no mueve nada más

- **WHEN** se pone, cambia o quita la fecha de una tarea
- **THEN** su título, su estado y su responsable son los mismos que antes

### Requirement: Fecha creada junto a la tarea

El sistema SHALL aceptar un `dueDate` opcional en `POST /api/v1/tasks` con las mismas reglas de formato que en la actualización, y SHALL crear la tarea sin fecha cuando no se envíe.

#### Scenario: Crear con fecha

- **WHEN** se envía `POST /api/v1/tasks` con `{"title": "Entregar informe", "dueDate": "2026-10-15"}`
- **THEN** la respuesta es 201 y la tarea tiene `dueDate` igual a "2026-10-15"

#### Scenario: Crear con fecha ya pasada

- **WHEN** se crea una tarea con una `dueDate` anterior al día de quien la crea
- **THEN** la respuesta es 201 y la tarea nace con `isOverdue` igual a `true`

#### Scenario: Crear con fecha inválida

- **WHEN** se envía `POST /api/v1/tasks` con un `title` válido y `dueDate` igual a "2026-02-30"
- **THEN** la respuesta es 422 con un error sobre `dueDate` y no se crea ninguna tarea

#### Scenario: Crear con fecha vacía

- **WHEN** se envía `POST /api/v1/tasks` con un `title` válido y `dueDate` igual a `null` o a cadena vacía
- **THEN** la tarea se crea sin fecha

### Requirement: Validez de la fecha

El sistema SHALL aceptar como `dueDate` únicamente un día de calendario real con el formato `YYYY-MM-DD`, y SHALL rechazar con 422 y un error sobre el campo `dueDate` cualquier otro valor, sin modificar la tarea.

#### Scenario: Fecha inexistente

- **WHEN** se envía `{"dueDate": "2026-02-30"}` o `{"dueDate": "2026-13-01"}`
- **THEN** la respuesta es 422 con un error sobre `dueDate` y la tarea conserva la fecha que tuviera

#### Scenario: Fecha incompleta o con otro formato

- **WHEN** se envía `{"dueDate": "2026-10"}`, `{"dueDate": "15/10/2026"}` o `{"dueDate": "mañana"}`
- **THEN** la respuesta es 422 con un error sobre `dueDate` y la tarea conserva la fecha que tuviera

#### Scenario: Fecha con hora

- **WHEN** se envía `{"dueDate": "2026-10-15T10:00:00Z"}`
- **THEN** la respuesta es 422 con un error sobre `dueDate`, porque la fecha es de calendario y no lleva hora

#### Scenario: Tipo equivocado

- **WHEN** se envía `{"dueDate": 20261015}` o `{"dueDate": true}`
- **THEN** la respuesta es 422 con un error sobre `dueDate`

### Requirement: Una fecha anterior a hoy se acepta

El sistema SHALL aceptar una `dueDate` anterior al día de referencia, al crear y al actualizar, sin rechazarla ni advertir de ello, porque registrar algo que ya llega tarde es legítimo.

#### Scenario: Fecha pasada al actualizar

- **WHEN** se envía una `dueDate` anterior a hoy sobre una tarea pendiente
- **THEN** la respuesta es 200 y la tarea pasa a tener `isOverdue` igual a `true` de inmediato

#### Scenario: Fecha pasada sobre una tarea hecha

- **WHEN** se envía una `dueDate` anterior a hoy sobre una tarea en estado `done`
- **THEN** la respuesta es 200, la fecha se guarda y `isOverdue` es `false`

### Requirement: Regla de tarea vencida

El sistema SHALL marcar una tarea con `isOverdue` igual a `true` si y solo si se cumplen las tres condiciones a la vez: tiene `dueDate`, esa fecha es anterior al día de referencia y su estado no es `done`; en cualquier otro caso `isOverdue` SHALL ser `false`.

#### Scenario: Fecha anterior a hoy y no hecha

- **WHEN** una tarea `pending` o `in_progress` tiene una fecha anterior al día de referencia
- **THEN** `isOverdue` es `true`

#### Scenario: Vencer hoy todavía no es estar vencida

- **WHEN** una tarea no hecha tiene como fecha el propio día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Fecha futura

- **WHEN** una tarea tiene una fecha posterior al día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Sin fecha no se vence nunca

- **WHEN** una tarea sin fecha, creada hace semanas y pendiente, se lee
- **THEN** `isOverdue` es `false`

#### Scenario: Hecha nunca está vencida

- **WHEN** una tarea en estado `done` tiene una fecha muy anterior al día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Darla por hecha la deja de vencer

- **WHEN** una tarea vencida pasa a `done`
- **THEN** la respuesta tiene `isOverdue` igual a `false` y `dueDate` sigue siendo la misma

#### Scenario: Volver desde hecha

- **WHEN** una tarea `done` con fecha anterior al día de referencia vuelve a `pending`
- **THEN** `isOverdue` es `true`, porque la fecha se conservó y la regla se evalúa en cada lectura

#### Scenario: Aplazar la fecha

- **WHEN** una tarea vencida recibe una `dueDate` posterior al día de referencia
- **THEN** `isOverdue` es `false`

#### Scenario: Quitar la fecha

- **WHEN** una tarea vencida se queda sin fecha
- **THEN** `isOverdue` es `false`

### Requirement: El veredicto se calcula en cada lectura

El sistema SHALL calcular `isOverdue` en cada respuesta que representa una tarea, sin guardarlo ni congelarlo, y SHALL ignorar cualquier `isOverdue` que envíe el cliente.

#### Scenario: Vence sin que nadie la toque

- **WHEN** una tarea no hecha con fecha de hoy se lee antes de la medianoche del día de referencia y otra vez después, sin que nadie la modifique
- **THEN** la primera lectura da `isOverdue` igual a `false` y la segunda `true`

#### Scenario: El cliente no puede enviarlo

- **WHEN** se envía `PATCH /api/v1/tasks/{id}` o `POST /api/v1/tasks` con `isOverdue` igual a `true` o a `false`
- **THEN** el valor se ignora y `isOverdue` de la respuesta es el que da la regla

#### Scenario: Solo isOverdue enviado

- **WHEN** se envía `PATCH /api/v1/tasks/{id}` con `{"isOverdue": true}` y ningún otro dato
- **THEN** la respuesta es 422, porque no hay ningún dato que cambiar, y la tarea no se modifica

### Requirement: El día de referencia es el de quien consulta

El sistema SHALL evaluar la regla de vencimiento con el día que envíe el cliente en la cabecera `X-Client-Date` (`YYYY-MM-DD`) en cada petición de tareas, SHALL usar el día UTC del servidor cuando no se envíe, y SHALL rechazar con 422 una cabecera mal formada.

#### Scenario: Dos personas, dos días

- **WHEN** una tarea no hecha tiene fecha "2026-10-14" y dos personas la leen a la vez, una con `X-Client-Date: 2026-10-15` y otra con `X-Client-Date: 2026-10-14`
- **THEN** la primera recibe `isOverdue` igual a `true` y la segunda `false`, y ambas lecturas son correctas

#### Scenario: Cabecera ausente

- **WHEN** se lee una tarea sin la cabecera `X-Client-Date`
- **THEN** la respuesta es 200 y la regla se evalúa con el día UTC del servidor

#### Scenario: Cabecera mal formada

- **WHEN** se envía `X-Client-Date: ayer` o `X-Client-Date: 2026-02-30`
- **THEN** la respuesta es 422 con un error sobre `X-Client-Date` y no se modifica nada

#### Scenario: La cabecera no altera los datos

- **WHEN** se envía cualquier valor válido de `X-Client-Date`
- **THEN** `dueDate` y los demás campos de la tarea son los mismos que con cualquier otro valor; solo `isOverdue` puede diferir

### Requirement: Lectura individual de una tarea

El sistema SHALL responder a `GET /api/v1/tasks/{id}` con la tarea indicada en `data`, con la misma forma que en el listado, y con 404 cuando no exista.

#### Scenario: Leer una tarea

- **WHEN** una persona con sesión envía `GET /api/v1/tasks/{id}` sobre una tarea existente
- **THEN** la respuesta es 200 con `data` que contiene `id`, `title`, `status`, `dueDate`, `isOverdue` y `assignee.fullName`

#### Scenario: Tarea de otra persona

- **WHEN** Grace lee una tarea cuyo responsable es Ada
- **THEN** la lee igual que una propia, sin ningún error de permisos

#### Scenario: Tarea inexistente

- **WHEN** se envía `GET /api/v1/tasks/{id}` con un identificador que no corresponde a ninguna tarea
- **THEN** la respuesta es 404

#### Scenario: Leer no modifica nada

- **WHEN** se lee varias veces la misma tarea
- **THEN** ninguna tarea cambia de título, estado, responsable ni fecha

### Requirement: Acceso a la tarea desde la lista

La aplicación SHALL ofrecer en cada fila de `/tasks` un enlace desde el título a `/tasks/{id}`, sin añadir a la fila ninguna fecha ni marca de vencida.

#### Scenario: Abrir desde la fila

- **WHEN** una persona pulsa el título de una tarea en `/tasks`
- **THEN** la aplicación navega a `/tasks/{id}` de esa tarea

#### Scenario: La fila no cambia lo que muestra

- **WHEN** hay tareas con fecha, algunas vencidas
- **THEN** cada fila sigue mostrando solo título, responsable y estado, sin fecha y sin marca de vencida

### Requirement: Tarea abierta

La aplicación SHALL mostrar en `/tasks/{id}` el título, el responsable, el estado y la fecha de vencimiento de la tarea, con un enlace para volver a la lista, y SHALL requerir sesión como el resto de pantallas.

#### Scenario: Tarea sin fecha

- **WHEN** una persona abre una tarea sin fecha
- **THEN** ve el campo de fecha vacío y no ve ningún aviso, recordatorio ni señal de que le falte algo

#### Scenario: Tarea con fecha

- **WHEN** una persona abre una tarea con fecha "2026-10-15"
- **THEN** ve esa fecha en el campo de fecha

#### Scenario: Cargando

- **WHEN** una persona abre `/tasks/{id}` y el servidor aún no ha respondido
- **THEN** ve un indicador de carga y no el campo de fecha

#### Scenario: Tarea inexistente

- **WHEN** una persona abre `/tasks/{id}` de una tarea que no existe
- **THEN** ve el aviso "No se encontró la tarea." y el enlace para volver a la lista

#### Scenario: Error al cargar

- **WHEN** el servidor no responde o responde con un error al abrir la tarea
- **THEN** ve un aviso de error en castellano y no ve el campo de fecha

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/tasks/{id}`
- **THEN** es redirigida a iniciar sesión, como en el resto de rutas protegidas

### Requirement: Edición de la fecha en la tarea abierta

La aplicación SHALL permitir poner, cambiar y quitar la fecha desde la tarea abierta sin ningún paso de guardado, reflejar el cambio sin recargar ni reabrir y quitar la fecha sin diálogo de confirmación.

#### Scenario: Poner una fecha

- **WHEN** una persona elige una fecha en el campo de una tarea sin fecha
- **THEN** la tarea queda con esa fecha, la ve reflejada sin recargar y no hace falta pulsar nada para guardarla

#### Scenario: Persiste al recargar

- **WHEN** una persona pone una fecha y recarga la página
- **THEN** la tarea sigue con esa fecha

#### Scenario: Quitar la fecha

- **WHEN** una persona pulsa "Quitar fecha" en una tarea con fecha
- **THEN** la tarea queda sin fecha de inmediato, sin diálogo de confirmación, y deja de mostrarse como vencida si lo estaba

#### Scenario: Borrar el campo a medias no quita la fecha

- **WHEN** una persona deja el campo de fecha incompleto o vacío mientras lo edita, sin pulsar "Quitar fecha"
- **THEN** no se envía ninguna petición y la tarea conserva su fecha

#### Scenario: Fecha pasada

- **WHEN** una persona elige una fecha anterior a hoy
- **THEN** la aplicación la acepta sin advertencia y la tarea se muestra como vencida

#### Scenario: Tarea de otra persona

- **WHEN** una persona cambia la fecha de una tarea cuyo responsable es otra
- **THEN** el cambio se aplica sin permiso especial ni advertencia

#### Scenario: Fallo del servidor

- **WHEN** el servidor no responde o rechaza el cambio de fecha
- **THEN** el campo vuelve a la fecha que tenía y la persona ve un aviso de error en castellano junto al campo

### Requirement: Fecha inválida junto al campo

La aplicación SHALL mostrar junto al campo de fecha, en castellano y sin tecnicismos, el motivo por el que el servidor rechaza una fecha, y SHALL conservar la fecha que la tarea tuviera.

#### Scenario: Fecha rechazada por el servidor

- **WHEN** el servidor responde 422 a un cambio de fecha
- **THEN** ve bajo el campo el mensaje "Introduce una fecha válida." y la tarea conserva la fecha anterior

#### Scenario: El mensaje desaparece

- **WHEN** una persona vuelve a elegir una fecha válida
- **THEN** el mensaje de error desaparece

### Requirement: Señal de tarea vencida

La aplicación SHALL indicar en la tarea abierta que está vencida cuando `isOverdue` sea `true`, con una señal propia de texto ("Vencida") e icono que no dependa solo del color, y SHALL NOT calcular el vencimiento por su cuenta.

#### Scenario: Tarea vencida

- **WHEN** una persona abre una tarea cuyo `isOverdue` es `true`
- **THEN** ve la señal "Vencida" sin tener que comparar la fecha con el día de hoy

#### Scenario: Vence hoy no se señala

- **WHEN** una persona abre una tarea no hecha cuya fecha es hoy
- **THEN** no ve la señal "Vencida"

#### Scenario: Hecha con fecha pasada

- **WHEN** una persona abre una tarea en estado `done` con fecha pasada
- **THEN** no ve la señal "Vencida"

#### Scenario: La señal sigue a la respuesta del servidor

- **WHEN** una persona cambia la fecha de una tarea y el servidor responde con `isOverdue` distinto del anterior
- **THEN** la señal aparece o desaparece según esa respuesta, sin recargar

#### Scenario: Accesible

- **WHEN** una persona usa solo el teclado o un lector de pantalla
- **THEN** puede operar el campo de fecha y "Quitar fecha", y la señal "Vencida" se anuncia como texto

### Requirement: El cliente envía su día de referencia

La aplicación SHALL enviar en cada petición de tareas la cabecera `X-Client-Date` con el día de calendario local de la persona, para que el veredicto de vencimiento sea el de su propio día.

#### Scenario: Día local

- **WHEN** una persona abre una tarea desde un huso en el que ya es el día siguiente al de UTC
- **THEN** la petición lleva `X-Client-Date` con su día local y el veredicto se calcula con él
