# Arquitectura de FlowSync

El diagrama muestra los contenedores de FlowSync según el modelo C4: la SPA de React que ve el equipo, la API de AdonisJS que expone `/api/v1` y la base de datos SQLite donde viven las cuentas, los tokens de acceso y las tareas. Lo que cada caja contiene y cada flecha dice se ha comprobado leyendo el código; no hay ningún sistema externo porque el repositorio no integra ninguno.

```mermaid
C4Container
    title FlowSync — diagrama de contenedores

    Person(user, "Miembro del equipo", "Se registra, entra y gestiona las tareas del espacio compartido")

    System_Boundary(flowsync, "FlowSync") {
        Container(spa, "SPA", "React 19, Vite 8, react-router, Tailwind v4, shadcn/ui", "Pantallas de login, registro, lista de tareas, detalle de tarea y perfil. Toda llamada al backend pasa por src/lib/api.ts. Guarda el token en localStorage (flowsync.token) y lo rehidrata contra GET /account/profile")
        Container(api, "API", "AdonisJS 7, Lucid 22, VineJS 4", "Rutas bajo /api/v1 (auth, account, tasks) → controladores → modelos User y Task. Validadores VineJS a la entrada y transformers a la salida; toda respuesta va envuelta en { data }. Autenticación con access tokens opacos (guard api)")
        ContainerDb(db, "Base de datos", "SQLite (better-sqlite3), tmp/db.sqlite3", "Tablas users, auth_access_tokens y tasks. Cada tarea referencia a su responsable en users y se borra con él")
    }

    Rel(user, spa, "Usa", "navegador")
    Rel(spa, api, "Consulta y modifica", "JSON sobre HTTP, Authorization: Bearer; URL en VITE_API_URL")
    Rel(api, db, "Lee y escribe", "Lucid")
```
