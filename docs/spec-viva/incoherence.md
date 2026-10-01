# Incoherencias — spec-viva `eb.md` frente al PRD (`docs/prd`)

> Comparación del 2026-10-01. Alcance: únicamente la vertical de cuentas y acceso — la ausencia de los requisitos E2/E3 (tareas) en `eb.md` **no** es una incoherencia: la spec debe cubrir solo esta vertical.
>
> **Jerarquía de fuentes** (declarada por el propio PRD, `flowsync-mvp.md:4`): `alcance-mvp.md` prevalece sobre `flowsync-mvp.md` en caso de contradicción. Para el **comportamiento actual**, la source of truth es el **código** — ese es el ámbito de la spec-viva. Para el **comportamiento objetivo** del MVP, la fuente es el PRD/alcance. Varias incoherencias de las que siguen son diferencias **temporales** (PRD = objetivo, spec = presente), no errores.
>
> **Grado de certeza**: confianza en el veredicto basado en el código, establecido mediante lectura directa con referencias `archivo:línea`. 100 = hecho inequívoco leído directamente; 95 = flujo de comportamiento leído íntegramente pero no ejecutado; 85 = comportamiento inferido (semántica del framework/navegador); <70 = veredicto cuyo propio alcance es discutible.

## Síntesis

| # | Incoherencia | Tipo | Source of truth | Certeza |
|---|---|---|---|---|
| 1 | Nombre completo obligatorio (PRD) frente a opcional (spec) | Redacción imprecisa del PRD | Código → spec | 100 |
| 2 | Tras el registro: «el espacio» (PRD) frente a pantalla de perfil (spec) | Diferencia temporal (objetivo frente a presente) | Código (presente) + PA-11 del PRD | 95 |
| 3 | Protección: «ninguna tarea sin sesión» (RF-4) frente a protección exclusiva del perfil | Diferencia temporal + cobertura | Código (presente) | 95 |
| 4 | Persistencia de sesión incondicional (RF-3) frente a condicional (spec) | Ideal del PRD frente a funcionamiento degradado | Código → spec | 95 |
| 5 | Criterio «botón atrás tras cerrar sesión» (RF-2) ausente de la spec | Falta de cobertura en la spec | Código → comportamiento satisfecho | 85 |
| 6 | Perfil especificado en la spec, nunca definido en el PRD | Contradicción interna del PRD | Código → spec | 100 |
| 7 | Mensaje de cierre de sesión en inglés frente a RNF-8 (todo en castellano) | Divergencia real, alcance discutible | Código (hecho cierto), aplicabilidad de RNF-8 dudosa | 65 |

---

## INC-1 — El nombre completo: obligatorio (PRD) frente a opcional (spec)

**Versión PRD** (`flowsync-mvp.md:150`, RF-1):
> « Una persona debe poder crear una cuenta **con nombre**, email y contraseña, y quedar automáticamente dentro del espacio compartido. »

El nombre figura entre los datos de registro sin marcarse como opcional. El documento de alcance no precisa los campos de registro.

**Versión spec-viva** (`eb.md`, requirement «El nombre completo es opcional en el registro» + scenario «Nombre opcional en la pantalla»):
> «El sistema SHALL aceptar un registro sin nombre completo y SHALL guardar la cuenta sin nombre.»

**Lo que dice el código**: `signupValidator` declara `fullName: vine.string().nullable()` (`backend/app/validators/user.ts:13`); la pantalla muestra «Nombre completo (opcional)» y envía `null` si el campo está vacío (`frontend/src/pages/register-page.tsx:42`).

**Source of truth: el código — la spec es fiel, certeza 100/100.** La regla `.nullable()` y la etiqueta «(opcional)» son inequívocas. La divergencia procede de una redacción poco precisa del PRD: «con nombre» se entiende como una enumeración descriptiva de los datos de la cuenta, no como una exigencia. La corrección corresponde al PRD (precisar «nombre opcional»), no a la spec.

---

## INC-2 — Tras el registro: «el espacio compartido» (PRD) frente a pantalla de perfil (spec)

**Versión PRD** (`flowsync-mvp.md:151`, aceptación de RF-1; `alcance-mvp.md:84`, fila 1):
> « tras registrarse queda con sesión iniciada y **ve el espacio** sin ningún paso adicional de invitación o alta en un equipo. »
> « Espacio único compartido — Quien se registra queda dentro y ve lo mismo que todos. »

**Versión spec-viva** (`eb.md`, requirement «Redirección al perfil tras autenticarse correctamente»):
> «La aplicación SHALL llevar automáticamente al usuario a **su pantalla de perfil** tras un registro o un inicio de sesión correcto.»

**Lo que dice el código**: tras signup/login, el estado pasa a `authenticated` y `PublicOnlyRoute` redirige a `/profile` (`frontend/src/routes/app-routes.tsx:11-14`, `public-only-route.tsx:13`). No existe ninguna pantalla de espacio ni de tareas — el alcance lo declara: «El dominio de tareas es greenfield» (`alcance-mvp.md:141`).

**Source of truth: el código para el presente (certeza 95/100) — el PRD para el objetivo.** Ambos documentos son correctos dentro de su ámbito: la spec describe el comportamiento actual (redirección al perfil), y el PRD, el MVP por construir (entrada al espacio). El propio PRD reconoce la diferencia en PA-11: «el criterio de RF-1 exige que quien se registra quede dentro de un espacio compartido, y ese espacio no existe todavía ni siquiera como concepto» (`flowsync-mvp.md:345-346`). No hay que corregir ninguno de los dos archivos: es una diferencia temporal reconocida, que deberá revisarse cuando existan E2/E3.

---

## INC-3 — Alcance protegido: «ninguna tarea sin sesión» (RF-4) frente a protección exclusiva del perfil

**Versión PRD** (`flowsync-mvp.md:159-160`, RF-4):
> « Sin sesión iniciada **no debe ser posible ver ni modificar ninguna tarea**. Aceptación: acceder a cualquier vista del espacio sin sesión redirige a inicio de sesión; ninguna tarea es visible en ese estado. »

**Versión spec-viva** (`eb.md`, requirement «Acceso al espacio privado reservado a las sesiones abiertas»): la protección descrita solo afecta a la pantalla de perfil — usuario anónimo → redirección al inicio de sesión; comprobación en curso → loader.

**Lo que dice el código**: solo `/profile` está protegido por un guard (`app-routes.tsx:16-18`); en la API, solo `/account/profile` y `/account/logout` exigen un token (`backend/start/routes.ts:35`). No existen tareas ni routes de tareas que proteger.

**Source of truth: el código para el presente (certeza 95/100).** La spec describe con exactitud lo que existe; RF-4 del PRD es una exigencia objetivo que podrá verificarse con E2. Atención: cuando existan las tareas, la spec deberá ampliar su requirement de protección — la expresión «espacio privado» que utiliza hoy solo designa el perfil y pasará a ser ambigua.

---

## INC-4 — Persistencia de sesión: incondicional (RF-3) frente a condicional (spec)

**Versión PRD** (`flowsync-mvp.md:156-157`, RF-3):
> « La sesión **debe** sobrevivir a una recarga de página y al cierre de la pestaña. Aceptación: recargar **no obliga** a volver a introducir credenciales. »

Es una afirmación absoluta que no contempla casos de funcionamiento degradado.

**Versión spec-viva** (`eb.md`, requirements «Persistencia de la sesión tras recargar» y «Pérdida de sesión explicada y conservación ante una indisponibilidad»): la persistencia está condicionada a que «el servidor reconozca la sesión guardada»; si el servidor la rechaza, se borra; si el servidor es inaccesible, se conserva la sesión guardada, pero se lleva al usuario a la pantalla de inicio de sesión con un mensaje.

**Lo que dice el código**: la rehydration llama a `GET /account/profile`; ante un 401 → `clearSession()` (token eliminado, `frontend/src/auth/auth-provider.tsx:60-62`); ante cualquier otro error → token conservado en disco, pero sesión cerrada en memoria y `sessionError` informado (`auth-provider.tsx:63-76`). Por tanto, la promesa del PRD solo se cumple si el backend responde y reconoce el token.

**Source of truth: el código — la spec es fiel, certeza 95/100.** Ambas ramas pueden leerse íntegramente; no se ha ejecutado el caso de fallo de red. Un token revocado no puede garantizar la promesa de RF-3: el PRD expresa el ideal del producto sin sus edge cases, y la spec documenta el comportamiento real. Conviene matizar RF-3 en el PRD («cuando el servidor reconoce la sesión»); la spec no requiere corrección.

---

## INC-5 — Criterio «botón atrás tras cerrar sesión» (RF-2): exigido por el PRD, ausente de la spec

**Versión PRD** (`flowsync-mvp.md:154`, aceptación de RF-2):
> « tras cerrar sesión, **volver atrás en el navegador** no devuelve el contenido del espacio. »

**Versión spec-viva**: ningún scenario de `eb.md` cubre el botón atrás del navegador después de cerrar sesión. Los requirements de cierre de sesión cubren el cierre local, la redirección al inicio de sesión, la revocación del token y el caso de servidor inaccesible — pero no la navegación por el historial.

**Lo que dice el código**: tras logout, el token se elimina de `localStorage` y el estado vuelve a `anonymous` (`auth-provider.tsx:98-107`); volver atrás a `/profile` hace que se renderice `ProtectedRoute`, que redirige a `/login` (`protected-route.tsx:13`). El contenido privado se renderiza en el cliente y exige una sesión: el criterio del PRD se cumple hoy (para el único contenido privado existente, el perfil).

**Source of truth: el código — el comportamiento se cumple; la spec tiene una falta de cobertura, certeza 85/100.** El razonamiento se basa en la semántica del router del cliente y del navegador, sin haber ejecutado el caso. Para completar la spec respecto al PRD, habría que añadir un scenario: WHEN el usuario vuelve atrás después de cerrar sesión, THEN no reaparece ningún contenido privado y se redirige al inicio de sesión.

---

## INC-6 — El perfil: especificado en la spec, nunca definido en el PRD

**Versión PRD**: la definición de E1 omite el perfil — «Registro, inicio y cierre de sesión, y protección del espacio compartido» (`flowsync-mvp.md:136`) — mientras que R-2 afirma: «Registro, inicio de sesión, **perfil** y cierre de sesión están implementados de punta a punta» (`flowsync-mvp.md:253`), y el alcance confirma: «capability de autenticación (signup, login, **perfil**, logout)» (`alcance-mvp.md:141`). Ningún RF define el contenido del perfil (iniciales, «Miembro desde», allowlist de campos).

**Versión spec-viva**: al menos tres requirements tratan el perfil — «Perfil sin datos sensibles» (allowlist: identificador, nombre, email, iniciales, fechas), «Cálculo de las iniciales» (3 scenarios), «Pantalla de perfil» (avatar, nombre, email, fecha de alta, botón).

**Lo que dice el código**: el perfil existe y hace exactamente lo que describe la spec — `profile_controller.ts:5-7`, allowlist en `user_transformer.ts:5-14`, regla de iniciales en `app/models/user.ts:11-17`, pantalla en `profile-page.tsx:13-68`.

**Source of truth: el código — la spec es fiel, certeza 100/100.** La divergencia es una **contradicción interna del PRD**: E1 (§5) omite el perfil que R-2 declara implementado. La spec cubre un vacío que el PRD reconoce sin especificarlo; es legítimo en una spec viva (describir lo que existe), pero estos requirements no tienen una justificación de producto explícita: si mañana el producto decidiera eliminar la pantalla de perfil, no se incumpliría ningún RF.

---

## INC-7 — Mensaje de cierre de sesión en inglés frente a RNF-8 («todo en castellano»)

**Versión PRD** (`flowsync-mvp.md:241`, RNF-8):
> « **Toda la interfaz y los mensajes de error, en castellano**, coherentes con lo ya existente. »

**Versión spec-viva** (`eb.md`, requirement «El cierre de sesión revoca el token utilizado»):
> «SHALL responder con un mensaje de confirmación fuera del wrapper de datos habitual.»

La spec describe la *forma* de la respuesta y evita precisar su *contenido*.

**Lo que dice el código**: la respuesta es `{ message: 'Logged out successfully' }` — en inglés — sin wrapper `{ data }` (`backend/app/controllers/access_tokens_controller.ts:25-27`). El frontend nunca muestra este mensaje: ignora el body de la respuesta de logout (`auth-provider.tsx:104-106`).

**Source of truth: el código — certeza 65/100 en el veredicto.** El hecho tiene una certeza del 100 % (string leído): el sistema emite un mensaje en inglés donde RNF-8 exige castellano. Sin embargo, el alcance de RNF-8 es discutible: se refiere a «la interfaz y los mensajes de error», y este mensaje de la API nunca llega a la interfaz. Es una divergencia real, pero hoy no tiene impacto en el usuario — habrá que decidir si algún día se muestra; en ese caso, debería prevalecer el PRD (traducir el mensaje en el servidor). También es un ejemplo de cómo «la spec omite lo que no puede decidir» — se señala aquí para hacer explícita esa omisión.

---

## Anexo — Aspectos que el PRD no define y que la spec convierte en contrato a partir del código

El PRD excluye por principio el diseño técnico («aquí no hay diseño técnico», `flowsync-mvp.md:5`): por tanto, lo que sigue **no** tiene una versión en el PRD. La spec lo convierte en `SHALL` — es el material de «bug o contrato» del ejercicio: hoy se considera contractual a falta de otra definición.

| Aspecto | Versión spec-viva | Veredicto del código (source of truth) | Certeza |
|---|---|---|---|
| Política de contraseñas de 8–32 caracteres + confirmación | SHALL, solo en el registro | `validators/user.ts:7,16` — regla explícita | 100 |
| Inicio de sesión sin política de contraseñas | SHALL (requirement específico) | `loginValidator`: `password: vine.string()` sin límites (`user.ts:25`) | 100 |
| Unicidad del email **case-sensitive** | «email ya registrado», sin precisar mayúsculas y minúsculas | Sin normalización (ni trim ni lowercase) en el validator ni en la UI; comparación exacta → `Ada@Mail.com` y `ada@mail.com` pueden coexistir | 85 |
| Token sin expiración | «sin expiración automática» SHALL | `accessTokens.create(user)` sin opciones (`new_account_controller.ts:11`, `access_tokens_controller.ts:11`) | 100 |
| Cierre de sesión sin conexión: el token sigue activo en el servidor | «en cualquier caso» (UI) — no se especifica qué ocurre con el token en el servidor | `api.logout().catch(() => undefined)`: si el servidor es inaccesible, el token sigue siendo válido en la base de datos indefinidamente | 100 |
| Sesiones concurrentes (N tokens activos) | SHALL (scenario «Sesiones concurrentes») | Cada login crea un token; logout solo revoca uno (`access_tokens_controller.ts:19-23`) | 100 |
| Usuario con sesión iniciada redirigido fuera de las pantallas de auth | SHALL | `public-only-route.tsx:13` | 100 |
| Email limitado a 254 caracteres | implícito en «email válido» | `validators/user.ts:6` + columna `string(254)` | 100 |

---

## Conclusión

- **Ninguna incoherencia invalida el comportamiento descrito en la spec**: en los 7 casos, el código confirma `eb.md` (certezas de 65–100; la única inferior a 85 es INC-7, cuyo hecho es cierto pero cuyo alcance es discutible).
- Tres incoherencias (INC-2, INC-3 y, en parte, INC-4) son **diferencias temporales**: el PRD describe el MVP objetivo y la spec, el sistema actual. El propio PRD las reconoce (PA-11). Se resolverán con E2/E3.
- Hay dos posibles correcciones **en el PRD**: precisar que el nombre es opcional (INC-1) y matizar que RF-3 es condicional (INC-4).
- Hay una posible corrección **en la spec**: cubrir el criterio «botón atrás tras cerrar sesión» de RF-2 (INC-5), y decidir si el mensaje en inglés de logout merece un requirement o si se omite de forma deliberada (INC-7).
- El anexo enumera lo que la spec convierte en contrato sin una decisión de producto que lo respalde: son candidatos naturales para la lista «¿bug o contrato?» de la Parte B.
