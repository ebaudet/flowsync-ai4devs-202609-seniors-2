# Exploración — vertical «cuentas y acceso» (FlowSync)

> [!tip]
> Notas de exploración elaboradas el 2026-10-01, en la rama `spec-viva-eb`.
> Este documento sirve de base para la spec viva [`eb.md`](./eb.md): todo lo descrito se ha leído en el código, con referencias a las fuentes (archivo:línea).
> No se ha modificado ninguna línea de código durante la exploración.

**Note langue** : la consigne de l'exercice 07 demande en principe une spec rédigée en espagnol (mots-clés RFC exceptés). Décision prise pour cette itération : rédiger en français ; traduire avant remise officielle éventuelle.

---

## 0. Recordatorio del marco

- Vertical: **registro, inicio de sesión, sesión y perfil** — sin ampliar el alcance.
- Dos capas: **backend** (routes, controllers, user model, validators, middleware) y **frontend** (pantallas de acceso, estado de sesión, protección de routes).
- Reglas de la spec (del curso M03 y del ejercicio 07):
  - `## Purpose` (1–2 frases) → `## Requirements` → `### Requirement:` con `SHALL` (RFC 2119) → `#### Scenario:` con exactamente dos puntos: `- **WHEN**` / `- **THEN**`.
  - Sin `GIVEN`: la precondición se integra en el `WHEN`.
  - Un scenario = una regla; no mezclar comportamientos en un requirement.
  - Sin `ADDED` / `MODIFIED` / `REMOVED` (no es un delta, sino el comportamiento actual).
  - Solo **comportamiento observable**: para la API, request + respuesta; para la UI, lo que una persona ve y puede hacer. Sin nombres de clases ni de archivos.
  - No modificar el código.

---

## 1. Visión general

### 1.1 Superficie de la API expuesta (`backend/start/routes.ts`)

| Método | Path completo | Auth | Controller (`#generated/controllers`) | Archivo |
|---|---|---|---|---|
| GET | `/` (hello world) | no | closure inline | `backend/start/routes.ts:14-16` |
| POST | `/api/v1/auth/signup` | no | `NewAccountController.store` | `routes.ts:22`, `app/controllers/new_account_controller.ts` |
| POST | `/api/v1/auth/login` | no | `AccessTokensController.store` | `routes.ts:23`, `app/controllers/access_tokens_controller.ts` |
| GET | `/api/v1/account/profile` | **sí** | `ProfileController.show` | `routes.ts:30`, `app/controllers/profile_controller.ts` |
| POST | `/api/v1/account/logout` | **sí** | `AccessTokensController.destroy` | `routes.ts:31`, mismo archivo que login |

- Prefijo global `/api/v1` (`routes.ts:37`).
- La protección se aplica **por grupo**: `.use(middleware.auth())` sobre el grupo `account` (`routes.ts:35`).
- Todas las respuestas pasan por el serializer propio `ctx.serialize()` → wrapper `{ data: ... }` — **salvo logout** (véase §4.1).

### 1.2 Flujo general

```
Registro        : UI (register) → POST /auth/signup → validator → User.create (hash automático) → token → { data: { user, token } } → sesión abierta en la UI → /profile
Inicio de sesión: UI (login)    → POST /auth/login  → validator → verifyCredentials → token → { data: { user, token } } → sesión abierta en la UI → /profile
Restauración    : carga de la app → GET /account/profile (Bearer token guardado) → sesión restaurada o pantalla de login con explicación
Perfil          : UI (profile)  → GET /account/profile → { data: { user } }
Cierre de sesión: UI (profile)  → POST /account/logout (revocación del token) → sesión cerrada en la UI → /login
```

---

## 2. Backend

### 2.1 Middleware (`backend/start/kernel.ts`)

| Capa | Middleware | Efecto |
|---|---|---|
| servidor (todas las requests) | `force_json_response_middleware` (`app/middleware/force_json_response_middleware.ts:5-8`) | sobrescribe `Accept: application/json` → todas las respuestas se sirven en JSON |
| servidor | `container_bindings_middleware` | inyección de `HttpContext`/`Logger` |
| servidor | CORS (package) | headers CORS por defecto |
| router | bodyparser, session, shield (packages) | parsing del body, sesión cargada (sin uso), headers de seguridad |
| router | `initialize_auth_middleware` (package) | hace disponible `ctx.auth` |
| router | `silent_auth_middleware` (`app/middleware/silent_auth_middleware.ts:11-15`) | `ctx.auth.check()` **silencioso**: asigna `auth.user` si hay un token válido, **nunca bloquea** |
| con nombre | `auth_middleware` (`app/middleware/auth_middleware.ts:17`) | `authenticateUsing(guards)` → **401** si falla la autenticación; aplicado al grupo `/api/v1/account` |

Dos capas: `silent_auth` se ejecuta en todas las requests y resuelve el usuario de antemano; `auth` (con nombre) es quien deniega el acceso. No hay redirecciones en la API: es stateless y responde directamente con 401.

### 2.2 Controllers — flujo exacto

**Signup** (`new_account_controller.ts:7-17`):
1. `request.validateUsing(signupValidator)` → `{ fullName, email, password }` (se valida la confirmación y luego se descarta).
2. `User.create(...)` — el **hash de la contraseña se calcula automáticamente** (mixin `withAuthFinder`, sin ningún hook visible en el model).
3. `User.accessTokens.create(user)` → token opaco.
4. Respuesta: `serialize({ user: UserTransformer.transform(user), token: token.value!.release() })` → `{ data: { user: {...}, token: "..." } }`.

**Login** (`access_tokens_controller.ts:7-18`):
1. `validateUsing(loginValidator)` → `{ email, password }`.
2. `User.verifyCredentials(email, password)` → lanza `E_INVALID_CREDENTIALS` si el email es desconocido **o** la contraseña es incorrecta (el mismo error en ambos casos).
3. Creación de un nuevo token (permite varias sesiones concurrentes).
4. Respuesta: el mismo formato que signup.

**Logout** (`access_tokens_controller.ts:19-28`):
1. `auth.getUserOrFail()`; si existe `user.currentAccessToken` → `User.accessTokens.delete(user, identifier)`: **solo se revoca el token utilizado** (las demás sesiones siguen activas).
2. Respuesta: `{ message: 'Logged out successfully' }` — **sin** wrapper `data` (no se llama a `serialize`).

**Profile** (`profile_controller.ts:5-7`): `getUserOrFail()` → `UserTransformer` → `{ data: { ...user } }`.

### 2.3 User model (`backend/app/models/user.ts`)

- `User extends compose(UserSchema, withAuthFinder(hash))` — las columnas se encuentran en el schema **generado** (`database/schema.ts:35-50`), no en el model.
- Columnas: `id`, `email` (string 254, `notNullable().unique()` — índice único **en la base de datos**, migration `1761885935168_create_users_table.ts:10`), `fullName` (nullable), `password` (nunca se serializa: `serializeAs: null`), `createdAt`, `updatedAt`.
- `accessTokens = DbAccessTokensProvider.forModel(User)`: tokens opacos almacenados en la tabla `auth_access_tokens` (migration `1768620764696_create_access_tokens_table.ts`). **No se configura ninguna expiración** al crearlos (`accessTokens.create(user)` sin opciones) → un token sigue activo hasta su revocación.
- Getter `initials` (`user.ts:11-17`):
  - con `fullName`: primera letra de la primera palabra + primera letra de la segunda, en mayúsculas (`"Ada Lovelace"` → `AL`);
  - una sola palabra (`"Ada"`): las dos primeras letras (`AD`);
  - sin `fullName`: split del email por `@` → primera letra de la parte local + primera letra del dominio (`ada@mail.com` → `AM`).

### 2.4 Validators (`backend/app/validators/user.ts`)

Builders compartidos (`user.ts:6-7`):
- `email = vine.string().email().maxLength(254)`
- `password = vine.string().minLength(8).maxLength(32)`

**signupValidator** (`user.ts:12-17`):

| Campo | Reglas |
|---|---|
| `fullName` | `string` **nullable** — la clave debe incluirse en el payload (puede valer `null`); sin longitud mínima ni máxima, se acepta un string vacío |
| `email` | email válido, ≤ 254 caracteres, **`.unique({ table: 'users', column: 'email' })`** |
| `password` | entre 8 y 32 caracteres |
| `passwordConfirmation` | entre 8 y 32 caracteres **y** `sameAs('password')` |

**loginValidator** (`user.ts:23-26`):

| Campo | Reglas |
|---|---|
| `email` | email válido, ≤ 254 caracteres (sin regla `unique`) |
| `password` | `vine.string()` — **sin restricción de longitud**, solo obligatorio |

### 2.5 Serialización y errores

- `ApiSerializer` (`backend/providers/api_provider.ts:10-34`): `wrap: 'data'` → toda respuesta serializada tiene el formato `{ data: ... }`.
- `UserTransformer` (`app/transformers/user_transformer.ts:5-14`): allowlist `id, fullName, email, createdAt, updatedAt, initials`. La contraseña nunca se expone.
- `app/exceptions/handler.ts` delega en el comportamiento por defecto de Adonis:

| Situación | HTTP | Body |
|---|---|---|
| Error de validación de VineJS | **422** | `{ errors: [{ message, field, rule, meta }, ...] }` |
| Credenciales inválidas (`E_INVALID_CREDENTIALS`) | **400** | mensaje de error genérico (sin array `errors`) |
| Token ausente / desconocido (guard `api`) | **401** | body prácticamente vacío |
| Violación de unicidad en la base de datos (race condition) | **500** (sin tratar) | error del servidor |

### 2.6 Configuración de auth (`backend/config/auth.ts`)

- Guard **por defecto: `api`** — `tokensGuard` + `tokensUserProvider` sobre `accessTokens` del User model.
- Guard `web` (sesión) configurado pero **sin uso** en las routes actuales.

---

## 3. Frontend

### 3.1 Routing y guards

`frontend/src/main.tsx`: `BrowserRouter > AuthProvider > AppRoutes`.

`frontend/src/routes/app-routes.tsx:8-23`:

| URL | Pantalla | Guard |
|---|---|---|
| `/login` | LoginPage | `PublicOnlyRoute` |
| `/register` | RegisterPage | `PublicOnlyRoute` |
| `/profile` | ProfilePage | `ProtectedRoute` |
| `*` (todo lo demás, incluido `/`) | redirección con **replace** a `/profile` | ninguno — sin página 404 |

`ProtectedRoute` (`routes/protected-route.tsx:12-15`):
- `status === 'loading'` → `<FullScreenLoader />` (spinner a pantalla completa, `role="status"`, «Cargando…» en `sr-only`) — no redirige hasta revalidar la sesión guardada;
- `status === 'anonymous'` → `<Navigate to="/login" replace />`;
- en caso contrario → `<Outlet />`.

`PublicOnlyRoute` (`routes/public-only-route.tsx:12-15`) — comportamiento inverso:
- `loading` → loader;
- `authenticated` → `<Navigate to="/profile" replace />`;
- en caso contrario → `<Outlet />`.

### 3.2 Estado de sesión (`frontend/src/auth/auth-provider.tsx`)

State machine: `status ∈ { loading, anonymous, authenticated }` (`auth-context.ts:4`).

- Token guardado en `localStorage` con la clave `flowsync.token` (`auth-provider.tsx:7`).
- Al montar el componente: si hay un token guardado → `status = 'loading'`; en caso contrario, `anonymous` (`:16-18`).
- Rehydration (`:43-82`): `GET /account/profile` con el token guardado:
  - **éxito** → `status = 'authenticated'`, usuario cargado;
  - **401** → `clearSession()`: token **eliminado** de `localStorage`, estado `anonymous`, `sessionError` informado (mensaje del backend);
  - **otro error** (backend caído, 5xx) → token **conservado en disco**, pero estado limpiado en memoria (`setToken(null)`), estado `anonymous`, `sessionError` informado → una recarga volverá a intentar la restauración.
- `login` / `signup` (`:84-96`): llaman a la API y luego a `startSession` → token persistido, `status = 'authenticated'`, `sessionError` borrado.
- `logout` (`:98-107`): `clearSession()` **inmediato e incondicional** (el objetivo de «dejar de tener una sesión abierta» se cumple en cualquier caso), seguido de una llamada a `POST /logout` cuyo fallo se ignora; `sessionError` vuelve a `null`.

Context expuesto (`auth-context.ts:6-15`): `{ user, token, status, sessionError, login, signup, logout }` — se lee mediante `useAuth()` (`auth/use-auth.ts`).

### 3.3 Pantalla de inicio de sesión (`frontend/src/pages/login-page.tsx`)

- Título «Inicia sesión», descripción «Entra con tu cuenta para volver a tus tareas.»
- Campos `email` (tipo email, `required`) y `password` (tipo password, `required`) — **pero `<form noValidate>`** (`:35`): no hay mensajes nativos del navegador; todo se delega en el backend.
- Botón «Entrar» → «Entrando…», desactivado durante el envío (`:78-80`).
- Alerta de variante destructive sobre el formulario: `formError ?? sessionError` (`:23`) — el error del intento actual tiene prioridad sobre la explicación de la pérdida de la sesión anterior.
- Errores por campo bajo cada input (`FieldError`, `aria-invalid`, `aria-describedby`).
- Enlace «Crea una» a `/register` (`:85-87`).
- Tras el éxito: `status` pasa a `authenticated` → `PublicOnlyRoute` redirige automáticamente a `/profile`.

### 3.4 Pantalla de registro (`frontend/src/pages/register-page.tsx`)

- Título «Crea tu cuenta», descripción «Regístrate para empezar a organizar el trabajo del equipo.»
- Campos: `fullName` (opcional, etiqueta «Nombre completo (opcional)»), `email` (required), `password` (required, `minLength={8}` en HTML pero con noValidate), `passwordConfirmation` (required).
- Indicación permanente bajo la contraseña mientras no haya errores: «Entre 8 y 32 caracteres.» (`:121-123`).
- **Comprobación local antes de cualquier llamada** (`:34-37`): si `password !== passwordConfirmation` → error bajo el campo de confirmación («Las contraseñas no coinciden.»), sin enviar ninguna request al servidor.
- A `fullName` se le aplica trim y se envía **`null` si queda vacío** (`:42`) — la clave siempre se incluye (contrato `.nullable()` del backend).
- Botón «Crear cuenta» → «Creando cuenta…», desactivado durante el envío (`:150-152`); enlace «Inicia sesión» a `/login` (`:157-159`).

### 3.5 Pantalla de perfil (`frontend/src/pages/profile-page.tsx`)

- Avatar circular con `user.initials` (`:35-37`).
- Nombre completo — fallback «Sin nombre» si `fullName` es nulo (`:39-41`) — y email debajo.
- Línea «Miembro desde»: fecha de alta en formato largo español (`Intl.DateTimeFormat('es-ES', { dateStyle: 'long' })`, `:13-15`).
- Botón «Cerrar sesión» → «Cerrando sesión…», desactivado durante la operación (`:61-68`); `ProtectedRoute` redirige a `/login` cuando el estado vuelve a `anonymous` (sin navigate manual).

### 3.6 Traducción de los errores de la API (`frontend/src/lib/api.ts`)

El cliente añade `Authorization: Bearer <token>` y encapsula todo en `ApiError` (`status` + `fieldErrors` por campo).

| Situación en el backend | Mensaje mostrado (español) |
|---|---|
| 401 | «Tu sesión ha caducado. Vuelve a iniciar sesión.» |
| 400 (credenciales inválidas) | «El email o la contraseña no son correctos.» |
| 422 `database.unique` en email | «Ese email ya está registrado. Inicia sesión en su lugar.» |
| 422 `sameAs` | «Las contraseñas no coinciden.» |
| 422 `email` | «Introduce una dirección de email válida.» |
| 422 `required` | «Falta rellenar el <campo>.» |
| 422 `minLength` | «<campo> debe tener al menos N caracteres.» |
| 422 `maxLength` | «<campo> no puede superar los N caracteres.» |
| Red no disponible | «No se pudo conectar con el servidor…» (status 0) |
| 500 / otro | «Algo ha ido mal en el servidor. Inténtalo de nuevo en un momento.» |

Distribución (`auth/use-auth-form.ts:34-51`): se filtran los `fieldErrors` según los campos realmente visibles en la pantalla; si **todos** los errores se pueden mostrar bajo un campo → no hay alerta general; en caso contrario, se muestra el mensaje global. Error que no es un `ApiError` → «Algo ha ido mal. Inténtalo de nuevo.».

### 3.7 Tipos compartidos (`frontend/src/lib/types.ts`)

```ts
User          = { id: number, fullName: string | null, email: string, initials: string, createdAt: string, updatedAt: string }
AuthResult    = { user: User, token: string }              // signup y login, tras retirar { data }
SignupPayload = { fullName: string | null, email, password, passwordConfirmation }
LoginPayload  = { email, password }
```

---

## 4. Observaciones, incoherencias y cuestiones abiertas (material para la Parte B)

### 4.1 Incoherencias visibles

1. **Logout no usa el wrapper** — respuesta directa `{ message }` (`access_tokens_controller.ts:25-27`), mientras que todos los demás endpoints devuelven `{ data: ... }` (`api_provider.ts`). El contrato de formato no es uniforme.
2. **La contraseña de login no tiene política de longitud** (`loginValidator`, `user.ts:25`) — a diferencia del registro (8–32). Observable: un login con una contraseña de 100 caracteres supera la validación y falla con 400.
3. **`fullName` acepta un string vacío** en el backend (sin restricciones), pero la UI siempre envía `null` tras aplicar trim (`register-page.tsx:42`) — dos clientes pueden generar datos distintos para representar la ausencia de nombre.
4. **Formularios con `noValidate`**: los atributos HTML `required` y `minLength={8}` están presentes, pero el navegador nunca los aplica; la validación efectiva se realiza íntegramente en el servidor (el hint «Entre 8 y 32 caracteres» sugiere una validación local que no existe, salvo la comprobación de coincidencia).
5. **No hay página 404**: cualquier URL desconocida (incluido `/`) redirige a `/profile` (`app-routes.tsx:20`).

### 4.2 «¿Bug o contrato?» — cuestiones que la lectura del código no permite resolver

1. **Vida útil de los tokens**: sin `expiresIn` al crearlos → un token es válido indefinidamente mientras no se revoque. ¿Decisión deliberada (sesiones largas) u olvido? No puede determinarse desde fuera sin esperar.
2. **Emails case-sensitive**: `verifyCredentials` y la comprobación de unicidad comparan los emails de forma **exacta** — `Jean@mail.com` y `jean@mail.com` pueden coexistir como dos cuentas, y para iniciar sesión hay que reproducir exactamente las mayúsculas y minúsculas originales. ¿Bug latente o contrato?
3. **Rehydration ante un fallo del servidor**: el token se conserva en disco, pero se redirige al usuario al login con un mensaje de error en **cada** recarga mientras el servidor esté caído — ¿UX deliberada (reintentar) o incoherencia de estado (el usuario cree que ha cerrado sesión)?
4. **Iniciales derivadas del email**: sin nombre, las iniciales toman la primera letra de la parte local + la primera letra del **dominio** (`ada@mail.com` → `AM`) — ¿intencionado (se esperarían las iniciales «AD»?) o efecto de `split('@')`?
5. **Doble protección de unicidad del email**: regla de VineJS (→ 422 de validación) **e** índice único en la base de datos (→ 500 sin tratar ante una race condition entre dos registros simultáneos). ¿Es el 500 un comportamiento aceptable dentro del contrato?

### 4.3 Estado de la verificación (para completar manualmente en la Parte B)

- Requirements escritos en `eb.md`: **21** (12 API + 9 UI), con **43 scenarios WHEN/THEN**.
- Requirements verificados en el código: *el revisor debe marcarlos — cada scenario de `eb.md` se apoya en los apartados §2/§3 anteriores; queda pendiente la comprobación mediante lectura personal del código.*
- La Parte B ya está **incluida en `eb.md`** (debajo de la spec): este §4 ha proporcionado el material; el análisis detallado del PRD se encuentra en [`incoherence.md`](./incoherence.md).

---

## 5. Fuentes exploradas

**Backend**: `start/routes.ts`, `start/kernel.ts`, `config/auth.ts`, `app/controllers/{new_account,access_tokens,profile}_controller.ts`, `app/models/user.ts`, `app/validators/user.ts`, `app/middleware/{silent_auth,auth,force_json_response}_middleware.ts`, `app/transformers/user_transformer.ts`, `app/exceptions/handler.ts`, `providers/api_provider.ts`, `database/schema.ts` (generado), `database/migrations/1761885935168_create_users_table.ts`, `database/migrations/1768620764696_create_access_tokens_table.ts`.

**Frontend**: `src/main.tsx`, `src/routes/{app-routes,protected-route,public-only-route}.tsx`, `src/auth/{auth-context,auth-provider,use-auth,use-auth-form}.ts(x)`, `src/pages/{login,register,profile}-page.tsx`, `src/lib/{api,types}.ts`, `src/components/{full-screen-loader,field-error,auth-layout}.tsx`.

**Curso M03** (`second-cerveau/…/M03 - SDD avec OpenSpec/`): archivos 01→07; formato de spec viva, vocabulario SHALL / WHEN-THEN, elementos prohibidos (`ADDED`/`MODIFIED`/`REMOVED`, nombres de implementación) y ejercicio 07 (alcance, reglas estrictas, Parte B).
