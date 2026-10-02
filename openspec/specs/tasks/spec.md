# tasks Specification

## Purpose

Mantiene una única lista compartida con las tareas del equipo, de modo que cualquier persona con sesión pueda ver en qué anda cada cual, anotar una tarea con solo su título y mantener al día su estado.

## Requirements

### Requirement: Listado de tareas

El sistema SHALL responder a `GET /api/v1/tasks` con todas las tareas existentes en `data`, cada una con `id`, `title`, `status` y `assignee`, donde `assignee` contiene únicamente el nombre del responsable en `fullName`.

#### Scenario: Lista con tareas

- **WHEN** una persona con sesión envía `GET /api/v1/tasks` y existen tres tareas
- **THEN** la respuesta es 200 y `data` contiene las tres, cada una con `id`, `title`, `status` y `assignee.fullName`

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
- **THEN** ninguna tarea cambia de título, estado ni responsable

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
- **THEN** no existe: la única forma de leer tareas es la lista completa

### Requirement: Creación de una tarea con solo el título

El sistema SHALL crear una tarea cuando reciba `POST /api/v1/tasks` con un `title` válido como único dato necesario, y SHALL responder 201 con la tarea creada en `data`.

#### Scenario: Creación con solo el título

- **WHEN** una persona con sesión envía `POST /api/v1/tasks` con el cuerpo `{"title": "Revisar el despliegue"}`
- **THEN** la respuesta es 201 con `data` que contiene la tarea con ese `title`, y la tarea aparece desde ese momento en `GET /api/v1/tasks`

#### Scenario: Espacios alrededor del título

- **WHEN** se crea una tarea con el `title` "  Revisar el despliegue  "
- **THEN** la tarea se guarda con el título "Revisar el despliegue", sin los espacios de los extremos

#### Scenario: Datos adicionales ignorados

- **WHEN** se envía `POST /api/v1/tasks` con un `title` válido y además `status`, `assignee` o una fecha de vencimiento
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

- **WHEN** se envía `PATCH /api/v1/tasks/{id}` sin `status`, o con `status` igual a `null` o vacío
- **THEN** la respuesta es 422 con un error de regla `required` sobre `status`

#### Scenario: Los tres valores válidos

- **WHEN** se envía `PATCH /api/v1/tasks/{id}` con `pending`, con `in_progress` o con `done`
- **THEN** cada petición responde 200 y la tarea queda exactamente en el estado enviado

### Requirement: Operaciones de la API de tareas

El sistema SHALL ofrecer exactamente tres operaciones sobre tareas (listar, crear y actualizar el estado), y SHALL NOT ofrecer lectura individual, borrado ni operaciones de equipo.

#### Scenario: Sin lectura individual

- **WHEN** se envía `GET /api/v1/tasks/{id}` con un identificador de una tarea existente
- **THEN** la respuesta es 404

#### Scenario: Sin borrado

- **WHEN** se envía `DELETE /api/v1/tasks/{id}` con un identificador de una tarea existente
- **THEN** la respuesta es 404 y la tarea sigue en la lista

### Requirement: Protección de la API de tareas

El sistema SHALL responder 401 con el mensaje "Unauthorized access" a cualquier petición de listar, crear o actualizar tareas que no lleve un token vigente en formato Bearer, sin crear ni modificar nada.

#### Scenario: Sin sesión

- **WHEN** se envía `GET /api/v1/tasks`, `POST /api/v1/tasks` o `PATCH /api/v1/tasks/{id}` sin cabecera `Authorization`
- **THEN** la respuesta es 401 con el mensaje "Unauthorized access", no se devuelve ninguna tarea y no se crea ni se modifica ninguna

#### Scenario: Token cerrado

- **WHEN** se envía `GET /api/v1/tasks` con un token de una sesión ya cerrada
- **THEN** la respuesta es 401

### Requirement: Las tareas no tienen fecha de vencimiento

El sistema SHALL NOT asociar fecha de vencimiento a las tareas ni exponer en ellas fecha alguna, de modo que ninguna tarea pueda considerarse vencida.

#### Scenario: Forma de la tarea

- **WHEN** se lista, se crea o se actualiza una tarea
- **THEN** su representación contiene solo `id`, `title`, `status` y `assignee`, sin ningún campo de fecha

#### Scenario: Fecha enviada

- **WHEN** se envía una fecha de vencimiento al crear una tarea
- **THEN** se ignora y la tarea creada no la contiene

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
