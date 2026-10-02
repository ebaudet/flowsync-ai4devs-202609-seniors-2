# Especificación de auth

## Purpose

Permite a una persona crear una cuenta, iniciar y cerrar sesión y consultar su perfil, tanto a través de la API HTTP como de las pantallas de la aplicación web. Esta spec describe el comportamiento que el sistema tiene hoy.

## Requirements

### Requirement: Registro de cuenta

El sistema SHALL crear una cuenta nueva y abrir una sesión para ella cuando reciba `POST /api/v1/auth/signup` con `fullName`, `email`, `password` y `passwordConfirmation` válidos, y SHALL responder con el usuario creado y un token de acceso dentro de `data`.

#### Scenario: Registro correcto

- **WHEN** se envía `POST /api/v1/auth/signup` con `fullName` "Ada Lovelace", un email que no existe, una contraseña de entre 8 y 32 caracteres y la misma contraseña en `passwordConfirmation`
- **THEN** la respuesta es 200 con `data.user` (`id`, `fullName`, `email`, `createdAt`, `updatedAt`, `initials`) y `data.token`, sin ningún campo de contraseña

#### Scenario: Registro sin nombre

- **WHEN** se envía el registro con `fullName` igual a `null` o a una cadena vacía
- **THEN** la cuenta se crea con `fullName` igual a `null` y la respuesta es 200

### Requirement: Validación de los datos de registro

El sistema SHALL rechazar con 422 cualquier registro cuyos datos no cumplan las reglas, SHALL devolver `errors` con un elemento por cada fallo (con `message`, `rule` y `field`) y SHALL NOT crear la cuenta.

#### Scenario: Campos ausentes

- **WHEN** se envía el registro sin cuerpo, o sin alguno de `fullName`, `email`, `password` o `passwordConfirmation` (la clave `fullName` es obligatoria aunque su valor pueda ser `null`)
- **THEN** la respuesta es 422 con un error de regla `required` por cada campo ausente

#### Scenario: Email con formato inválido

- **WHEN** se envía el registro con un `email` que no es una dirección válida o que supera los 254 caracteres
- **THEN** la respuesta es 422 con un error sobre el campo `email`

#### Scenario: Contraseña fuera de longitud

- **WHEN** se envía el registro con una `password` de menos de 8 o de más de 32 caracteres
- **THEN** la respuesta es 422 con un error de longitud sobre `password`, y además otro sobre `passwordConfirmation` si esta también tiene una longitud fuera de rango (si no, el error adicional es de regla `sameAs` cuando ambas difieren)

#### Scenario: Confirmación distinta

- **WHEN** se envía el registro con un `passwordConfirmation` de longitud válida pero distinto de `password`
- **THEN** la respuesta es 422 con un error de regla `sameAs` sobre el campo `passwordConfirmation`

### Requirement: Email único por cuenta

El sistema SHALL rechazar el registro con un email que ya pertenece a otra cuenta, y SHALL tratar los emails como distintos cuando difieren solo en mayúsculas o minúsculas.

#### Scenario: Email ya registrado

- **WHEN** se envía el registro con un `email` idéntico al de una cuenta existente
- **THEN** la respuesta es 422 con un error de regla `database.unique` sobre el campo `email`

#### Scenario: Email que solo cambia en mayúsculas

- **WHEN** se envía el registro con "ADA@x.com" y ya existe una cuenta con "ada@x.com"
- **THEN** la respuesta es 200 y se crea una cuenta distinta

### Requirement: Inicio de sesión

El sistema SHALL abrir una sesión nueva cuando reciba `POST /api/v1/auth/login` con un `email` y una `password` que corresponden a una cuenta, y SHALL devolver en `data` el usuario y un token nuevo en cada inicio de sesión sin invalidar los tokens anteriores.

#### Scenario: Credenciales correctas

- **WHEN** se envía `POST /api/v1/auth/login` con el email y la contraseña de una cuenta existente
- **THEN** la respuesta es 200 con `data.user` y `data.token`

#### Scenario: Varios inicios de sesión de la misma cuenta

- **WHEN** la misma cuenta inicia sesión dos veces seguidas
- **THEN** se obtienen dos tokens distintos y ambos permiten consultar el perfil

### Requirement: Rechazo de credenciales incorrectas

El sistema SHALL responder 400 con el mensaje "Invalid user credentials" cuando el email y la contraseña no corresponden a una cuenta, y SHALL dar la misma respuesta tanto si el email no existe como si la contraseña es errónea.

#### Scenario: Contraseña errónea

- **WHEN** se envía el inicio de sesión con un email existente y una contraseña incorrecta
- **THEN** la respuesta es 400 con `errors` que contiene el mensaje "Invalid user credentials"

#### Scenario: Email inexistente

- **WHEN** se envía el inicio de sesión con un email que no pertenece a ninguna cuenta
- **THEN** la respuesta es 400 con el mismo cuerpo que en el caso de contraseña errónea

#### Scenario: Email con otras mayúsculas

- **WHEN** se envía el inicio de sesión con "Ada@x.com" y la cuenta se registró como "ada@x.com"
- **THEN** la respuesta es 400 con el mensaje "Invalid user credentials"

### Requirement: Validación de los datos de inicio de sesión

El sistema SHALL rechazar con 422 los inicios de sesión sin `email` o `password`, o con un `email` sin formato de dirección, antes de comprobar las credenciales.

#### Scenario: Campos ausentes

- **WHEN** se envía el inicio de sesión sin cuerpo, o con `email` o `password` ausentes o vacíos
- **THEN** la respuesta es 422 con un error de regla `required` por cada campo ausente o vacío

#### Scenario: Email con formato inválido

- **WHEN** se envía el inicio de sesión con `email` igual a "nope"
- **THEN** la respuesta es 422 con un error sobre el campo `email`

### Requirement: Consulta del perfil

El sistema SHALL responder a `GET /api/v1/account/profile` con los datos de la cuenta dueña del token enviado en la cabecera `Authorization: Bearer <token>`.

#### Scenario: Token válido

- **WHEN** se envía `GET /api/v1/account/profile` con un token vigente
- **THEN** la respuesta es 200 con `data` que contiene `id`, `fullName`, `email`, `createdAt`, `updatedAt` e `initials` de esa cuenta

### Requirement: Iniciales del usuario

El sistema SHALL incluir en cada usuario devuelto un campo `initials` en mayúsculas calculado a partir de su nombre, o de su email cuando no tiene nombre.

#### Scenario: Nombre de dos palabras o más

- **WHEN** se devuelve un usuario con `fullName` "Ada Lovelace" (o "Ana María Pérez")
- **THEN** `initials` contiene la primera letra de las dos primeras palabras, separadas por un único espacio: "AL" (o "AM")

#### Scenario: Nombre de una sola palabra

- **WHEN** se devuelve un usuario con `fullName` "Madonna"
- **THEN** `initials` contiene sus dos primeras letras: "MA"

#### Scenario: Usuario sin nombre

- **WHEN** se devuelve un usuario con `fullName` igual a `null` y email "nn@x.com"
- **THEN** `initials` es "NX": la primera letra de la parte anterior a la arroba y la primera letra del dominio

### Requirement: Protección de las rutas de cuenta

El sistema SHALL responder 401 con el mensaje "Unauthorized access" a cualquier petición a `GET /api/v1/account/profile` o `POST /api/v1/account/logout` que no lleve un token vigente en formato Bearer.

#### Scenario: Petición sin token

- **WHEN** se envía `GET /api/v1/account/profile` sin cabecera `Authorization`
- **THEN** la respuesta es 401 con `errors` que contiene el mensaje "Unauthorized access"

#### Scenario: Token inventado o sin esquema Bearer

- **WHEN** se envía la petición con un token que no existe, o con un token válido pero sin el prefijo `Bearer`
- **THEN** la respuesta es 401 con el mismo cuerpo que en el caso anterior

#### Scenario: Rutas públicas

- **WHEN** se envía una petición de registro o de inicio de sesión sin `Authorization`, o con un token inválido en esa cabecera
- **THEN** la petición se procesa con normalidad (200 si los datos son correctos) y el token inválido se ignora

### Requirement: Cierre de sesión

El sistema SHALL invalidar el token usado cuando reciba `POST /api/v1/account/logout`, y SHALL conservar vigentes los demás tokens de la misma cuenta.

#### Scenario: Cierre correcto

- **WHEN** se envía `POST /api/v1/account/logout` con un token vigente
- **THEN** la respuesta es 200 con el mensaje "Logged out successfully" y ese token deja de ser válido

#### Scenario: Uso del token tras cerrar sesión

- **WHEN** se usa un token ya cerrado para consultar el perfil o para volver a cerrar sesión
- **THEN** la respuesta es 401 con el mensaje "Unauthorized access"

#### Scenario: Otras sesiones de la misma cuenta

- **WHEN** una cuenta con dos tokens vigentes cierra sesión con uno de ellos
- **THEN** el otro token sigue permitiendo consultar el perfil

### Requirement: Respuestas de autenticación en JSON

El sistema SHALL responder en JSON a las peticiones de autenticación, incluidas las respuestas de error, aunque la petición pida otro tipo de contenido.

#### Scenario: Error con Accept distinto de JSON

- **WHEN** se envía `GET /api/v1/account/profile` sin token y con la cabecera `Accept: text/html`
- **THEN** la respuesta es 401 con un cuerpo JSON

### Requirement: Pantalla de registro

La aplicación SHALL ofrecer en `/register` un formulario con los campos "Nombre completo" (opcional), "Email", "Contraseña" (con la indicación "Entre 8 y 32 caracteres.") y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" hacia la pantalla de acceso.

#### Scenario: Registro correcto

- **WHEN** una persona sin sesión rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** queda con la sesión abierta y ve su pantalla de perfil

#### Scenario: Nombre en blanco

- **WHEN** una persona deja el nombre vacío o solo con espacios y completa el registro
- **THEN** la cuenta se crea sin nombre y su perfil muestra "Sin nombre"

#### Scenario: Contraseñas distintas

- **WHEN** una persona pulsa "Crear cuenta" con las dos contraseñas distintas
- **THEN** ve bajo "Repite la contraseña" el mensaje "Las contraseñas no coinciden." sin que el formulario se envíe al servidor

#### Scenario: Email ya registrado

- **WHEN** una persona se registra con un email que ya tiene cuenta
- **THEN** ve bajo el campo "Email" el mensaje "Ese email ya está registrado. Inicia sesión en su lugar."

#### Scenario: Contraseña demasiado larga

- **WHEN** una persona se registra con una contraseña de más de 32 caracteres repetida igual en "Repite la contraseña"
- **THEN** ve bajo "Contraseña" el mensaje "la contraseña no puede superar los 32 caracteres."

#### Scenario: Contraseña demasiado corta

- **WHEN** una persona se registra con una contraseña de menos de 8 caracteres repetida igual en "Repite la contraseña"
- **THEN** ve bajo "Contraseña" y bajo "Repite la contraseña" un mensaje en castellano que indica la longitud mínima exigida

### Requirement: Pantalla de inicio de sesión

La aplicación SHALL ofrecer en `/login` un formulario con los campos "Email" y "Contraseña", un botón "Entrar" y un enlace "Crea una" hacia la pantalla de registro.

#### Scenario: Inicio de sesión correcto

- **WHEN** una persona sin sesión introduce el email y la contraseña de su cuenta y pulsa "Entrar"
- **THEN** queda con la sesión abierta y ve su pantalla de perfil

#### Scenario: Credenciales incorrectas

- **WHEN** una persona pulsa "Entrar" con un email o una contraseña que no corresponden a una cuenta
- **THEN** ve un aviso de error con el texto "El email o la contraseña no son correctos." y permanece en la pantalla de acceso

#### Scenario: Email con formato inválido

- **WHEN** una persona pulsa "Entrar" con un email que no tiene formato de dirección
- **THEN** ve bajo el campo "Email" el mensaje "Introduce una dirección de email válida."

#### Scenario: Campos vacíos

- **WHEN** una persona pulsa "Entrar" con el email y la contraseña vacíos
- **THEN** ve bajo "Email" el mensaje "Falta rellenar el email." y bajo "Contraseña" el mensaje "Falta rellenar la contraseña."

### Requirement: Errores de conexión y del servidor en los formularios

Las pantallas de registro y de inicio de sesión SHALL mostrar en un aviso general, en castellano, los fallos que no corresponden a un campo visible del formulario.

#### Scenario: Servidor inaccesible

- **WHEN** una persona envía el formulario de acceso o de registro y el servidor no responde
- **THEN** ve el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado."

#### Scenario: Error interno del servidor

- **WHEN** una persona envía el formulario y el servidor responde con un error interno o con cualquier otro error inesperado
- **THEN** ve el aviso "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento."

### Requirement: Estado de envío de los formularios

Las pantallas de registro y de inicio de sesión SHALL deshabilitar su botón de envío mientras la petición está en curso y SHALL indicar el progreso en el propio botón.

#### Scenario: Envío en curso

- **WHEN** una persona pulsa "Entrar" (o "Crear cuenta") y el servidor aún no ha respondido
- **THEN** el botón queda deshabilitado y muestra "Entrando…" (o "Creando cuenta…")

#### Scenario: Envío fallido

- **WHEN** el servidor responde con un error a un envío
- **THEN** el botón vuelve a estar habilitado con su texto original para poder reintentar

### Requirement: Pantalla de perfil

La aplicación SHALL mostrar en `/profile` a la persona con sesión abierta sus iniciales, su nombre (o "Sin nombre" si no lo tiene), su email, la fecha "Miembro desde" en formato largo en castellano y un botón "Cerrar sesión".

#### Scenario: Perfil con nombre

- **WHEN** una persona con sesión abierta, registrada como "Ada Lovelace" el 1 de octubre de 2026, abre `/profile`
- **THEN** ve "AL", "Ada Lovelace", su email y "Miembro desde" con el valor "1 de octubre de 2026"

#### Scenario: Perfil sin nombre

- **WHEN** abre `/profile` una persona cuya cuenta no tiene nombre
- **THEN** ve "Sin nombre" como nombre, junto con sus iniciales y su email

### Requirement: Cierre de sesión desde la aplicación

La aplicación SHALL cerrar la sesión de la persona al pulsar "Cerrar sesión" y llevarla a la pantalla de inicio de sesión, tanto si el servidor confirma el cierre como si no.

#### Scenario: Cierre correcto

- **WHEN** una persona con sesión abierta pulsa "Cerrar sesión"
- **THEN** la persona acaba en `/login` sin sesión y su token deja de ser válido en el servidor

#### Scenario: Servidor inaccesible al cerrar

- **WHEN** una persona pulsa "Cerrar sesión" y el servidor no responde o rechaza el token
- **THEN** la persona acaba igualmente en `/login` sin sesión

#### Scenario: Acceso posterior

- **WHEN** una persona que ha cerrado sesión intenta abrir `/profile`
- **THEN** es llevada a `/login`

### Requirement: Persistencia de la sesión al recargar

La aplicación SHALL conservar la sesión abierta al recargar la página y SHALL comprobarla contra el servidor antes de darla por buena, mostrando un indicador de carga mientras tanto.

#### Scenario: Recarga con sesión vigente

- **WHEN** una persona con sesión abierta recarga la página en `/profile`
- **THEN** ve primero un indicador de carga a pantalla completa y después su perfil, sin pasar por `/login`

#### Scenario: Sesión caducada o revocada

- **WHEN** una persona recarga la página y el servidor ya no reconoce su sesión
- **THEN** es llevada a `/login`, ve el aviso "Tu sesión ha caducado. Vuelve a iniciar sesión." y, al recargar de nuevo, no vuelve a quedar con sesión abierta

#### Scenario: Servidor inaccesible al recargar

- **WHEN** una persona recarga la página y el servidor no responde
- **THEN** es llevada a `/login` con el aviso "No se pudo conectar con el servidor. Comprueba que el backend está arrancado." (o "Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento." si el servidor responde con un error), y al recargar de nuevo cuando el servidor vuelve a responder recupera su sesión sin volver a introducir sus credenciales

#### Scenario: Aviso de sesión perdida

- **WHEN** una persona ve en `/login` el aviso de sesión perdida, inicia sesión con éxito y después cierra sesión
- **THEN** vuelve a `/login` sin ningún aviso

### Requirement: Acceso a pantallas según el estado de sesión

La aplicación SHALL restringir `/profile` a las personas con sesión abierta, SHALL restringir `/login` y `/register` a las personas sin sesión y SHALL llevar cualquier otra dirección al perfil.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre `/profile`
- **THEN** es llevada a `/login`

#### Scenario: Acceso o registro con sesión abierta

- **WHEN** una persona con sesión abierta abre `/login` o `/register`
- **THEN** es llevada a `/profile`

#### Scenario: Dirección desconocida

- **WHEN** una persona abre una dirección que no existe en la aplicación
- **THEN** es llevada a `/profile`, y desde allí a `/login` si no tiene sesión

#### Scenario: Comprobación de sesión en curso

- **WHEN** la aplicación está comprobando una sesión guardada y la persona está en `/profile`, `/login` o `/register`
- **THEN** ve el indicador de carga y no es redirigida hasta que se conozca el resultado
