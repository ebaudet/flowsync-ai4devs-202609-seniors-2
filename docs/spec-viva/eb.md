## Purpose

Esta capability gestiona el ciclo de vida de las cuentas y del acceso a la aplicación: crear una cuenta, iniciar sesión, mantenerla abierta y consultar el perfil. Describe el comportamiento actual del sistema, observable tanto desde la API como desde la interfaz.

## Requirements

### Requirement: Registro con datos válidos

El sistema SHALL crear una cuenta cuando el registro incluya un email válido que aún no esté registrado, una contraseña de entre 8 y 32 caracteres y una confirmación idéntica, y SHALL responder con los datos de la cuenta creada y un token de sesión, sin incluir nunca la contraseña en la respuesta.

#### Scenario: Registro correcto
- **WHEN** se envía una request a `POST /api/v1/auth/signup` con un nombre, un email válido que aún no esté registrado, una contraseña de entre 8 y 32 caracteres y el mismo valor en la confirmación
- **THEN** la respuesta indica éxito e incluye `{ data: { user, token } }`, donde `user` expone el identificador, el nombre, el email, las iniciales y las dos fechas de la cuenta, y `token` contiene un token de sesión utilizable de inmediato

#### Scenario: La contraseña nunca se expone
- **WHEN** un registro o un inicio de sesión se completa correctamente
- **THEN** la respuesta no contiene en ningún lugar la contraseña proporcionada ni su hash

### Requirement: El nombre completo es opcional en el registro

El sistema SHALL aceptar un registro sin nombre completo y SHALL guardar la cuenta sin nombre.

#### Scenario: Registro sin nombre
- **WHEN** se envía una request a `POST /api/v1/auth/signup` con la clave del nombre a `null`, un email válido y una contraseña y su confirmación válidas
- **THEN** la cuenta se crea sin nombre y la respuesta indica éxito, igual que en un registro con nombre

### Requirement: Validación del formato de los datos de registro

El sistema SHALL rechazar cualquier registro cuyos datos no respeten el formato esperado, antes de crear la cuenta, respondiendo con 422 y errores asociados al campo correspondiente.

#### Scenario: Email con formato incorrecto
- **WHEN** se envía un registro con un valor que no es una dirección de email válida
- **THEN** la respuesta es 422 con un error asociado al campo email y no se crea ninguna cuenta

#### Scenario: Contraseña fuera de los límites
- **WHEN** se envía un registro con una contraseña de menos de 8 o de más de 32 caracteres
- **THEN** la respuesta es 422 con un error asociado al campo de contraseña y no se crea ninguna cuenta

#### Scenario: Confirmación distinta
- **WHEN** se envía un registro con una confirmación distinta de la contraseña
- **THEN** la respuesta es 422 con un error asociado al campo de confirmación

#### Scenario: Falta un campo obligatorio
- **WHEN** se envía un registro sin email, sin contraseña o sin confirmación
- **THEN** la respuesta es 422 con un error de «campo obligatorio» asociado al campo que falta

### Requirement: Unicidad del email

El sistema SHALL rechazar un registro cuyo email ya esté registrado, aunque el resto de los datos sean válidos.

#### Scenario: Email ya utilizado
- **WHEN** se envía un registro con un email ya asociado a una cuenta existente
- **THEN** la respuesta es 422 con un error asociado al campo email que indica que ya está registrado, y no se crea ninguna cuenta nueva

### Requirement: Inicio de sesión con credenciales válidas

El sistema SHALL abrir una sesión cuando se proporcionen el email de una cuenta existente y su contraseña correcta, respondiendo con los datos de la cuenta y un nuevo token de sesión.

#### Scenario: Inicio de sesión correcto
- **WHEN** se envía una request a `POST /api/v1/auth/login` con el email de una cuenta existente y su contraseña exacta
- **THEN** la respuesta indica éxito e incluye `{ data: { user, token } }` con un nuevo token de sesión

#### Scenario: Sesiones concurrentes
- **WHEN** la misma cuenta inicia sesión correctamente dos veces seguidas
- **THEN** cada inicio de sesión genera su propio token y ambos tokens siguen siendo utilizables al mismo tiempo

### Requirement: Rechazo de credenciales inválidas sin revelar la causa

El sistema SHALL responder con 400 y el mismo mensaje genérico cuando el email no corresponda a ninguna cuenta o la contraseña sea incorrecta, sin indicar cuál de los dos datos causa el error.

#### Scenario: Email desconocido
- **WHEN** se intenta iniciar sesión con un email que no corresponde a ninguna cuenta y una contraseña cualquiera
- **THEN** la respuesta es 400 con un mensaje genérico de error en las credenciales

#### Scenario: Contraseña incorrecta
- **WHEN** se intenta iniciar sesión con el email de una cuenta existente y una contraseña incorrecta
- **THEN** la respuesta es 400 con exactamente el mismo mensaje genérico que para un email desconocido

### Requirement: El inicio de sesión no aplica la política de contraseñas

El sistema SHALL comprobar las credenciales sin aplicar al inicio de sesión la política de longitud exigida en el registro.

#### Scenario: Contraseña fuera de la política al iniciar sesión
- **WHEN** se intenta iniciar sesión con una contraseña de cualquier longitud, por ejemplo de un solo carácter
- **THEN** no se devuelve ningún error de validación de longitud; la respuesta depende únicamente de la validez del par email / contraseña

### Requirement: Autenticación de requests mediante Bearer token

El sistema SHALL autenticar las requests a los recursos de cuenta mediante un token de sesión enviado en el header de autorización de tipo Bearer, y SHALL rechazar cualquier request sin token o con un token desconocido.

#### Scenario: Acceso al perfil con un token válido
- **WHEN** se envía una request a `GET /api/v1/account/profile` con un token de sesión válido en el header de autorización
- **THEN** la respuesta indica éxito e incluye `{ data: { user } }`

#### Scenario: Acceso sin token
- **WHEN** se envía una request a `GET /api/v1/account/profile` sin header de autorización
- **THEN** la respuesta es 401

#### Scenario: Token desconocido
- **WHEN** se envía una request con un valor de token que nunca se ha emitido
- **THEN** la respuesta es 401

### Requirement: Persistencia de la sesión hasta su revocación

El sistema SHALL mantener utilizable un token de sesión mientras no se haya revocado, sin expiración automática.

#### Scenario: Token reutilizable tras su emisión
- **WHEN** un token emitido durante un registro o un inicio de sesión se utiliza de nuevo para acceder al perfil
- **THEN** se acepta sin necesidad de volver a autenticarse

### Requirement: El cierre de sesión revoca el token utilizado

El sistema SHALL revocar el token de sesión utilizado para cerrar sesión y SHALL responder con un mensaje de confirmación fuera del wrapper de datos habitual; los demás tokens de la misma cuenta SHALL seguir siendo válidos.

#### Scenario: Cierre de sesión correcto
- **WHEN** se envía una request a `POST /api/v1/account/logout` con un token de sesión válido
- **THEN** la respuesta es un mensaje de confirmación fuera del wrapper `{ data }`, y cualquier request posterior que utilice ese mismo token recibe 401

#### Scenario: Las demás sesiones siguen activas
- **WHEN** una cuenta con dos tokens distintos cierra sesión con uno de ellos
- **THEN** el segundo token sigue siendo aceptado para acceder al perfil

#### Scenario: Cierre de sesión sin token válido
- **WHEN** se envía una request a `POST /api/v1/account/logout` sin token o con un token desconocido
- **THEN** la respuesta es 401

### Requirement: Perfil sin datos sensibles

El sistema SHALL exponer en el perfil únicamente una allowlist de datos de la cuenta: identificador, nombre completo, email, iniciales y las dos fechas de seguimiento.

#### Scenario: Contenido del perfil
- **WHEN** se solicita el perfil de una cuenta con un token válido
- **THEN** la respuesta contiene el identificador, el nombre completo (sin nombre si no se ha indicado), el email, las iniciales y las fechas de creación y actualización, y nunca contiene la contraseña

### Requirement: Cálculo de las iniciales

El sistema SHALL calcular las iniciales de la cuenta a partir del nombre completo cuando esté informado —la primera letra de cada una de las dos primeras palabras— y, en caso contrario, a partir del email, en mayúsculas.

#### Scenario: Iniciales a partir del nombre
- **WHEN** la cuenta tiene un nombre completo de dos palabras, por ejemplo «Ada Lovelace»
- **THEN** las iniciales expuestas son las primeras letras de ambas palabras en mayúsculas, es decir, «AL»

#### Scenario: Iniciales a partir del email
- **WHEN** la cuenta no tiene nombre completo y su email es, por ejemplo, «ada@mail.com»
- **THEN** las iniciales expuestas son la primera letra de la parte anterior a la arroba seguida de la primera letra de la parte posterior a la arroba, en mayúsculas

#### Scenario: Nombre de una sola palabra
- **WHEN** la cuenta tiene un nombre completo de una sola palabra
- **THEN** las iniciales expuestas son las dos primeras letras de esa palabra en mayúsculas

### Requirement: Acceso al espacio privado reservado a las sesiones abiertas

La aplicación SHALL impedir el acceso a la pantalla de perfil a cualquier persona sin una sesión abierta, redirigiéndola a la pantalla de inicio de sesión, y SHALL mostrar un indicador de carga a pantalla completa mientras se comprueba la validez de una sesión guardada.

#### Scenario: Usuario anónimo en el perfil
- **WHEN** una persona sin una sesión abierta solicita la pantalla de perfil
- **THEN** se la redirige a la pantalla de inicio de sesión sin mostrarle en ningún momento el contenido del perfil

#### Scenario: Comprobación en curso
- **WHEN** la aplicación arranca con una sesión guardada cuya validez se está comprobando
- **THEN** se muestra un indicador de carga a pantalla completa, sin redirigir prematuramente al inicio de sesión

### Requirement: Pantallas de autenticación inaccesibles con una sesión abierta

La aplicación SHALL redirigir a la pantalla de perfil a cualquier persona que ya tenga una sesión abierta e intente acceder a las pantallas de inicio de sesión o de registro.

#### Scenario: Usuario conectado en la pantalla de inicio de sesión
- **WHEN** una persona con una sesión abierta solicita la pantalla de inicio de sesión o de registro
- **THEN** se la redirige a su pantalla de perfil

### Requirement: Pantalla de inicio de sesión

La aplicación SHALL ofrecer una pantalla de inicio de sesión con un campo email, un campo de contraseña, un botón de envío y un enlace a la pantalla de registro, SHALL desactivar el botón y mostrar un texto que indique la operación en curso durante el envío, y SHALL presentar los errores mediante una alerta general y mensajes bajo cada campo con errores.

#### Scenario: Envío en curso
- **WHEN** se envía el formulario de inicio de sesión
- **THEN** el botón queda desactivado y muestra un texto que indica la operación en curso hasta que termina el procesamiento

#### Scenario: Error al iniciar sesión
- **WHEN** el inicio de sesión falla por credenciales inválidas
- **THEN** una alerta general indica que el email o la contraseña es incorrecto

#### Scenario: Explicación de una sesión perdida
- **WHEN** el usuario llega a la pantalla de inicio de sesión tras perder una sesión anterior
- **THEN** una alerta general explica el motivo de la pérdida mientras no se haya realizado un nuevo intento

#### Scenario: Navegación al registro
- **WHEN** el usuario sigue el enlace de la pantalla de inicio de sesión
- **THEN** se muestra la pantalla de registro

### Requirement: Pantalla de registro

La aplicación SHALL ofrecer una pantalla de registro con un campo de nombre completo opcional, un campo email, un campo de contraseña acompañado de una indicación de la longitud esperada, un campo de confirmación, un botón de envío y un enlace a la pantalla de inicio de sesión, y SHALL comprobar localmente que ambas contraseñas coinciden antes de enviar los datos al servidor.

#### Scenario: Coincidencia comprobada en el cliente
- **WHEN** las dos contraseñas introducidas son distintas y se envía el formulario
- **THEN** se muestra un error bajo el campo de confirmación sin enviar ninguna request al servidor

#### Scenario: Indicación de la longitud de la contraseña
- **WHEN** se muestra la pantalla de registro y el campo de contraseña no tiene errores
- **THEN** una indicación permanente informa de la longitud esperada de la contraseña

#### Scenario: Errores de validación del servidor
- **WHEN** el servidor rechaza el registro por errores en campos visibles
- **THEN** cada campo con errores muestra su mensaje bajo el input y no se muestra una alerta general si todos los errores están asociados a esos campos

#### Scenario: Nombre opcional en la pantalla
- **WHEN** el usuario envía el registro dejando vacío el campo de nombre completo
- **THEN** el registro se envía sin nombre y se completa igual que un registro con nombre

### Requirement: Redirección al perfil tras autenticarse correctamente

La aplicación SHALL llevar automáticamente al usuario a su pantalla de perfil tras un registro o un inicio de sesión correcto, con la sesión abierta y sin tener que volver a introducir datos.

#### Scenario: Tras un registro correcto
- **WHEN** se envía el formulario de registro con datos válidos
- **THEN** el usuario llega a su pantalla de perfil con la sesión ya iniciada

#### Scenario: Tras un inicio de sesión correcto
- **WHEN** se envía el formulario de inicio de sesión con credenciales válidas
- **THEN** el usuario llega a su pantalla de perfil con la sesión ya iniciada

### Requirement: Pantalla de perfil

La aplicación SHALL mostrar en la pantalla de perfil un avatar con las iniciales de la cuenta, el nombre completo —o un texto que indique su ausencia—, el email, la fecha de alta en formato de fecha largo y un botón de cierre de sesión desactivado y con un texto que indique la operación en curso mientras esta se realiza.

#### Scenario: Visualización del perfil
- **WHEN** un usuario con sesión iniciada abre su pantalla de perfil
- **THEN** el avatar muestra sus iniciales, se muestra su nombre completo o un texto que indique su ausencia, y son visibles su email y su fecha de alta escrita en formato largo

#### Scenario: Cierre de sesión en curso
- **WHEN** el usuario activa el botón de cierre de sesión
- **THEN** el botón queda desactivado y muestra un texto que indica la operación en curso

### Requirement: El cierre de sesión vuelve al inicio de sesión en cualquier caso

La aplicación SHALL cerrar la sesión localmente y redirigir a la pantalla de inicio de sesión en cuanto se active el cierre, aunque el servidor no responda, y SHALL borrar cualquier sesión guardada en el navegador.

#### Scenario: Cierre de sesión con el servidor inaccesible
- **WHEN** el usuario solicita cerrar sesión mientras el servidor no responde
- **THEN** se cierra la sesión local, se redirige al usuario a la pantalla de inicio de sesión y el espacio privado sigue siendo inaccesible para él

### Requirement: Persistencia de la sesión tras recargar

La aplicación SHALL restaurar la sesión abierta al recargar la página o en el siguiente arranque, sin volver a pedir credenciales, cuando el servidor reconozca la sesión guardada en el navegador.

#### Scenario: Recarga con una sesión válida
- **WHEN** el usuario recarga la página y el servidor sigue reconociendo su sesión guardada
- **THEN** vuelve a ver su perfil con la sesión iniciada tras el indicador de carga

### Requirement: Pérdida de sesión explicada y conservación ante una indisponibilidad

La aplicación SHALL distinguir, al arrancar, entre una sesión guardada que el servidor rechaza y un servidor inaccesible: en el primer caso, SHALL borrar la sesión y explicar su pérdida en la pantalla de inicio de sesión; en el segundo, SHALL conservar la sesión guardada para un nuevo intento y mostrar un mensaje de indisponibilidad.

#### Scenario: Sesión rechazada por el servidor
- **WHEN** la aplicación arranca con una sesión guardada que el servidor rechaza
- **THEN** se borra la sesión del navegador, se lleva al usuario a la pantalla de inicio de sesión y una alerta explica por qué se ha perdido su sesión

#### Scenario: Servidor inaccesible al arrancar
- **WHEN** la aplicación arranca con una sesión guardada pero el servidor es inaccesible
- **THEN** se lleva al usuario a la pantalla de inicio de sesión con un mensaje de indisponibilidad y se conserva la sesión para volver a intentarlo en la siguiente carga

---

# Parte B — las tres listas

## 1. Requirements escritos / requirements verificados

- **Requirements escritos: 21**
- **Requirements verificados mediante lectura del código: 21** — de los cuales 4 solo se han verificado hasta el límite del framework (con un criterio estricto: 17)

> *Nota: este recuento refleja la verificación realizada durante la sesión de exploración (lectura directa del código del repositorio). Antes de entregar, sustitúyelo por **tu** propio recuento tras tu revisión personal: verificar significa haber comprobado si el código realmente hace lo descrito; leer el requirement y considerarlo plausible no cuenta.*

## 2. Incoherencias detectadas durante la redacción

- El cierre de sesión responde **fuera del wrapper `{ data }`** que utilizan todos los demás endpoints — visible en el controller de tokens (`access_tokens_controller.ts:25-27`).
- El inicio de sesión no exige **ninguna longitud de contraseña**, mientras que el registro exige entre 8 y 32 caracteres — visible al comparar los dos validators (`app/validators/user.ts:7` frente a `:25`).
- El backend acepta un nombre completo como **string vacío** (sin trim ni longitud mínima), mientras que el frontend siempre envía `null`: dos clientes representan de forma distinta la ausencia de nombre — visible al comparar `user.ts:13` y `register-page.tsx:42`.
- Los formularios usan `noValidate`: los atributos HTML `required` y `minLength` están presentes pero **el navegador nunca los aplica**; la indicación «Entre 8 y 32 caracteres» sugiere una comprobación local que no existe (salvo la coincidencia de contraseñas) — visible en ambas pantallas (`login-page.tsx:35`, `register-page.tsx:55`).
- **No hay página 404**: cualquier URL desconocida, incluida la raíz, redirige al perfil — visible en el routing (`app-routes.tsx:20`).
- Dos registros simultáneos con el mismo email pueden eludir el 422 de validación y acabar en un **500 sin tratar**: la regla de validación y el índice único de la base de datos coexisten sin gestionar la race condition — visible al comparar `user.ts:14` y la migration de la tabla `users`.
- Sin conexión, el cierre de sesión termina la sesión local pero **deja el token válido en la base de datos indefinidamente** — visible al comparar `auth-provider.tsx:104-106` y el controller de logout.
- El PRD exige una cuenta «**con nombre**»; el sistema trata el nombre como opcional — visible al comparar RF-1 (`flowsync-mvp.md:150`) y `user.ts:13`.
- El PRD promete una sesión que **siempre persiste** (RF-3); solo persiste si el servidor es accesible y reconoce el token — visible al comparar `flowsync-mvp.md:156` y `auth-provider.tsx:57-76`.
- La épica E1 del PRD **omite el perfil** que R-2 declara implementado de principio a fin — visible al comparar `flowsync-mvp.md:136` y `:253`.
- El mensaje de cierre de sesión está **en inglés**, mientras que RNF-8 exige castellano — visible al comparar `access_tokens_controller.ts:26` y `flowsync-mvp.md:241`.

## 3. Lo que no he podido determinar: ¿bug o contrato?

- **Vida útil de los tokens.** Un token emitido nunca expira por sí solo: ¿el contrato establece que «una sesión dura hasta el cierre explícito», o falta una expiración que nadie ha decidido?
- **Mayúsculas y minúsculas en los emails.** `Ada@Mail.com` y `ada@mail.com` pueden coexistir como dos cuentas y cada una exige su combinación exacta al iniciar sesión: ¿falta una normalización (bug latente), o el email se considera un identificador que debe coincidir exactamente (contrato)?
- **Fallo del servidor al arrancar.** El token se conserva en disco, pero se lleva a la persona a la pantalla de inicio de sesión en cada recarga mientras el servidor sea inaccesible: ¿es una decisión de resiliencia (reintentar cuando vuelva), o una incoherencia de estado (la persona cree que ha cerrado sesión)?
- **Iniciales sin nombre.** Sin nombre completo, las iniciales toman la primera letra de la parte local y la del dominio (`ada@mail.com` → «AM»): ¿es una regla deliberada o un efecto del split por la arroba que nunca se ha decidido?
- **Cierre de sesión sin conexión.** El token que no se ha revocado en el servidor sigue siendo válido indefinidamente si no se ha podido contactar con la API: ¿cerrar la sesión local basta para cumplir el contrato, o queda una sesión fantasma?
