# Spec Delta

## MODIFIED Requirements

### Requirement: Pantalla de registro

La aplicación SHALL ofrecer en `/register` un formulario con los campos "Nombre completo" (opcional), "Email", "Contraseña" (con la indicación "Entre 8 y 32 caracteres.") y "Repite la contraseña", un botón "Crear cuenta" y un enlace "Inicia sesión" hacia la pantalla de acceso.

#### Scenario: Registro correcto

- **WHEN** una persona sin sesión rellena el formulario con datos válidos y pulsa "Crear cuenta"
- **THEN** queda con la sesión abierta y ve la lista de tareas

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
- **THEN** queda con la sesión abierta y ve la lista de tareas

#### Scenario: Credenciales incorrectas

- **WHEN** una persona pulsa "Entrar" con un email o una contraseña que no corresponden a una cuenta
- **THEN** ve un aviso de error con el texto "El email o la contraseña no son correctos." y permanece en la pantalla de acceso

#### Scenario: Email con formato inválido

- **WHEN** una persona pulsa "Entrar" con un email que no tiene formato de dirección
- **THEN** ve bajo el campo "Email" el mensaje "Introduce una dirección de email válida."

#### Scenario: Campos vacíos

- **WHEN** una persona pulsa "Entrar" con el email y la contraseña vacíos
- **THEN** ve bajo "Email" el mensaje "Falta rellenar el email." y bajo "Contraseña" el mensaje "Falta rellenar la contraseña."

### Requirement: Pantalla de perfil

La aplicación SHALL mostrar en `/profile` a la persona con sesión abierta sus iniciales, su nombre (o "Sin nombre" si no lo tiene), su email, la fecha "Miembro desde" en formato largo en castellano, un enlace "Volver a las tareas" hacia la lista y un botón "Cerrar sesión".

#### Scenario: Perfil con nombre

- **WHEN** una persona con sesión abierta, registrada como "Ada Lovelace" el 1 de octubre de 2026, abre `/profile`
- **THEN** ve "AL", "Ada Lovelace", su email y "Miembro desde" con el valor "1 de octubre de 2026"

#### Scenario: Perfil sin nombre

- **WHEN** abre `/profile` una persona cuya cuenta no tiene nombre
- **THEN** ve "Sin nombre" como nombre, junto con sus iniciales y su email

#### Scenario: Volver a la lista

- **WHEN** una persona con sesión abierta pulsa "Volver a las tareas" en su perfil
- **THEN** ve la lista de tareas en `/tasks`

### Requirement: Acceso a pantallas según el estado de sesión

La aplicación SHALL restringir `/tasks` y `/profile` a las personas con sesión abierta, SHALL restringir `/login` y `/register` a las personas sin sesión y SHALL llevar cualquier otra dirección a la lista de tareas.

#### Scenario: Perfil sin sesión

- **WHEN** una persona sin sesión abre `/profile`
- **THEN** es llevada a `/login`

#### Scenario: Lista sin sesión

- **WHEN** una persona sin sesión abre `/tasks`
- **THEN** es llevada a `/login` y no ve ninguna tarea

#### Scenario: Acceso o registro con sesión abierta

- **WHEN** una persona con sesión abierta abre `/login` o `/register`
- **THEN** es llevada a `/tasks`

#### Scenario: Dirección desconocida

- **WHEN** una persona abre una dirección que no existe en la aplicación
- **THEN** es llevada a `/tasks`, y desde allí a `/login` si no tiene sesión

#### Scenario: Comprobación de sesión en curso

- **WHEN** la aplicación está comprobando una sesión guardada y la persona está en `/tasks`, `/profile`, `/login` o `/register`
- **THEN** ve el indicador de carga y no es redirigida hasta que se conozca el resultado
