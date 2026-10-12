# 1. Usar las delta-specs de OpenSpec como fuente de verdad viva

## Estado

Aceptada, 2026-10-12. Se registra a posteriori: la práctica ya rige el repositorio desde los tres changes archivados de 2026-08-13 (`add-task-list`, `add-task-due-date` y `add-task-status-filter`).

## Contexto

FlowSync describe su comportamiento en cuatro sitios que no coinciden solos: el PRD y el backlog en `docs/`, el código, `CLAUDE.md` (que lista las rutas) y `openspec/`. Cuando el comportamiento cambia, lo que se escribió antes envejece sin que nada lo avise. El repositorio ya lo ha sufrido:

- La spec viva decía que `GET /api/v1/tasks` devolvía «todas las tareas del espacio». El filtro por estado (FS-142) se implementó sin actualizarla, y la spec no volvió a decir la verdad hasta que el change `add-task-status-filter` documentó, después de hecho, lo que el código ya hacía (commit `209df12`). Su propio `proposal.md` lo admite: «este change documenta comportamiento que ya está implementado».
- `CLAUDE.md` sigue listando solo las cuatro rutas de `auth` y `account`, y ninguna de `tasks`.

Lo que hay hoy en `openspec/`, `schema: spec-driven` en `config.yaml`:

- **Specs vivas**, una por capability: `openspec/specs/auth/spec.md` (19 requisitos, 45 scenarios) y `openspec/specs/tasks/spec.md` (32 requisitos, 124 scenarios). Cada requisito lleva su `SHALL` y sus scenarios `WHEN`/`THEN`.
- **Changes**, una carpeta por unidad de trabajo, con `proposal.md` (por qué, qué cambia, fuera de alcance, riesgos), `design.md` (decisiones y alternativas descartadas), `tasks.md` y, sobre todo, **delta-specs** en `specs/<capability>/spec.md`. Un delta no repite la spec: declara `ADDED`, `MODIFIED` o `REMOVED` requisitos. Por ejemplo, `add-task-due-date` añade 11 requisitos a `tasks` y modifica uno; `add-task-list` añade `tasks` y modifica `auth`, porque la lista pasa a ser la pantalla de entrada.
- **Archivo**: al terminar, el change pasa a `openspec/changes/archive/<fecha>-<nombre>/` y sus deltas se funden en la spec viva. El historial de por qué cambió cada requisito queda en el archivo, no en la spec.
- Varias skills de `.claude/skills/` (`openspec-propose`, `-apply-change`, `-verify-change`, `-sync-specs`, `-archive-change`) implementan ese flujo para el agente.

## Decisión

La fuente de verdad de lo que FlowSync debe hacer son las specs vivas de `openspec/specs/`. Se mantienen exclusivamente a través de changes de OpenSpec:

1. Todo cambio de comportamiento empieza como un change con su proposal, su design y sus **delta-specs**. No se edita la spec viva a mano.
2. Se implementa contra las delta-specs y se verifica contra ellas.
3. Al archivar, los deltas se sincronizan con la spec viva, y el change archivado conserva el porqué.
4. Cualquier otra descripción del sistema —el código, los tests, `CLAUDE.md`, un documento OpenAPI— se deriva de la spec. Si discrepan, es un defecto del código o de la spec, y se resuelve con un change; no se deja la discrepancia sin dueño.

## Consecuencias

### Lo que ganamos

- Un solo sitio donde leer qué hace cada capability, en el lenguaje del producto y no en el del código.
- Cada cambio es una diferencia legible: el delta enseña qué requisitos se añaden o se tocan sin releer la spec entera, y el change archivado explica por qué.
- Las decisiones y sus alternativas descartadas quedan escritas (`design.md`), junto con lo que se dejó fuera a propósito y los riesgos.
- El agente trabaja con contexto estable y verificable: scenarios concretos en vez de una descripción vaga.

### Lo que nos cuesta

- **La spec no se hace cumplir sola, y ya ha divergido del código dos veces.** Primero fue el filtro por estado (arriba). Después, el commit `8c15707` cambió `listTasksValidator` de `vine.enum(TASK_STATUSES).optional()` a `vine.string().optional()`. La spec exige `422` para un estado inventado y el código responde `200` con lista vacía. El `design.md` archivado decía que quitar el validador sería «un cambio que se ve», y se hizo en un refactor sin que nada avisara.
- **Sin tests, la spec es una promesa sin comprobar.** Ninguno de los 124 scenarios de `tasks` tiene un test, y los tres changes archivados declaran «sin tests» como decisión explícita. Esta decisión no los exige, y por eso no cierra el hueco que acabamos de ver.
- **Hay una ceremonia por cada cambio**: proposal, design, tasks y deltas, incluso para cambios pequeños. Si el trabajo sale antes que el change, la spec se escribe a posteriori y deja de guiar nada, como pasó con `add-task-status-filter`.
- **Mantener la spec viva exige un paso de sincronización** que se puede olvidar. Solo dos commits tocan `openspec/`, y la spec viva fue por detrás del código hasta el segundo.
- **La spec es larga y mezcla capas.** `tasks` junta en un solo archivo los scenarios de la API y los de la pantalla (56 de los 124 describen la interfaz y 68, la API), y varios son negativos («no existe ninguna operación…») y no verificables de forma mecánica.
- **Tenemos más copias que cuidar.** `CLAUDE.md` ya está desactualizado, y cada artefacto derivado (documentación de la API, tablas de rutas) es una copia más que puede envejecer.
- **`openspec/config.yaml` no codifica nada del proyecto**: el contexto y las reglas están en comentarios de plantilla, de modo que las reglas del flujo viven en las skills y en las costumbres, no en la configuración.
- **Dependemos de la herramienta y de su formato** (`ADDED`/`MODIFIED`/`REMOVED`, la estructura de carpetas, las skills). Cambiar de herramienta supone migrar las specs.
