# Arquitectura de FlowSync

El diagrama muestra los contenedores de FlowSync según el modelo C4: la SPA de React que usa el equipo, la API de AdonisJS que expone `/api/v1` y la base de datos SQLite donde viven las cuentas, los tokens de acceso y las tareas. En tiempo de ejecución no hay ningún sistema externo, así que no se dibuja ninguno.

```mermaid
C4Container
    title FlowSync — diagrama de contenedores

    Person(user, "Miembro del equipo", "Se registra, entra y gestiona las tareas")

    System_Boundary(flowsync, "FlowSync") {
        Container(spa, "SPA", "React 19, Vite 8", "Login, registro, lista y detalle de tareas, perfil. Todas las llamadas salen de src/lib/api.ts; las autenticadas llevan el token de localStorage en Authorization: Bearer")
        Container(api, "API", "AdonisJS 7, Lucid 22", "Rutas /api/v1 hacia controladores, validadores VineJS, modelos User y Task y transformers. Access tokens opacos")
        ContainerDb(db, "Base de datos", "SQLite", "backend/tmp/db.sqlite3: users, auth_access_tokens y tasks")
    }

    Rel(user, spa, "Usa", "navegador")
    Rel(spa, api, "Llama", "JSON")
    Rel(api, db, "Lee y escribe", "Lucid")
```
