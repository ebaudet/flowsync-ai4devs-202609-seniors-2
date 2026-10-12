# 1. Usar las delta-specs de OpenSpec como fuente de verdad viva

## Estado

**Reemplazada por el [ADR 0002](0002-tests-como-fuente-de-verdad-ejecutable.md)**, 2027-10-12. La fecha y el reemplazo son supuestos (el 0002 es un escenario hipotético, véase su estado): a 2026-10-12 este ADR sigue vigente. El contexto y la decisión de abajo se conservan tal y como se escribieron: son lo que se creía entonces.

Estado anterior: Aceptada, 2026-10-12, con una salvedad: se registra a posteriori y la práctica solo la ha cumplido en parte (ver «Lo que nos cuesta»). Los tres changes de `openspec/changes/archive/` llevan la fecha 2026-08-13 en su carpeta, pero dos de ellos se archivaron en un commit posterior al que los implementó.

## Contexto

FlowSync describe su comportamiento en varios sitios que no coinciden solos: el PRD y el backlog en `docs/`, el código, `CLAUDE.md` (que lista las rutas) y `openspec/`. Cuando el comportamiento cambia, lo que se escribió antes envejece sin que nada lo avise. El repositorio ya lo ha sufrido:

- La spec viva decía que `GET /api/v1/tasks` devolvía «todas las tareas del espacio». El filtro por estado (FS-142) se implementó por delegación directa, y el prompt de aquella demo decía «no toques openspec/», así que el código filtraba y el contrato no se enteraba. El commit `209df12` lo documentó a posteriori con el change `add-task-status-filter`, cuyo `proposal.md` admite: «este change documenta comportamiento que ya está implementado». Ese mismo commit reconoce que quedó una mención a «todas las tareas del espacio» en `## Purpose`, que un `MODIFIED` no puede tocar; sigue ahí.
- `CLAUDE.md` sigue listando solo las cuatro rutas de `auth` y `account`, y ninguna de `tasks`.

Lo que hay hoy en `openspec/` (`schema: spec-driven` en `config.yaml`):

- **Specs vivas**, una por capability: `openspec/specs/auth/spec.md` (19 requisitos, 45 scenarios) y `openspec/specs/tasks/spec.md` (32 requisitos, 124 scenarios). Cada requisito lleva su `SHALL` y sus scenarios `WHEN`/`THEN`.
- **Changes**, una carpeta por unidad de trabajo, con `proposal.md` (por qué, qué cambia, fuera de alcance, riesgos), `design.md` (decisiones y alternativas descartadas), `tasks.md` y **delta-specs** en `specs/<capability>/spec.md`. Un delta declara requisitos `ADDED`, `MODIFIED` o `REMOVED`. `add-task-list` añade 14 requisitos a `tasks`, y en `auth` modifica 3 y añade 1, porque la lista pasa a ser la pantalla de entrada. `add-task-due-date` añade 11 y modifica 1. `add-task-status-filter` añade 7 y modifica 4.
- **Archivo**: el change terminado pasa a `openspec/changes/archive/<fecha>-<nombre>/`. Antes de archivar, la skill `openspec-archive-change` ofrece sincronizar los deltas con la spec viva («Sync now» o «Archive without syncing»). Ese sync lo hace un agente que lee los deltas y edita directamente la spec principal.
- Varias skills de `.claude/skills/` (`openspec-propose`, `-apply-change`, `-verify-change`, `-sync-specs`, `-archive-change`) implementan ese flujo.

## Decisión

La fuente de verdad de lo que FlowSync debe hacer son las specs vivas de `openspec/specs/`, y cada cambio de comportamiento llega a ellas a través de un change de OpenSpec:

1. Todo cambio de comportamiento empieza como un change con su proposal, su design y sus **delta-specs**.
2. Se implementa contra las delta-specs y se verifica contra ellas.
3. Al archivar, los deltas se sincronizan con la spec viva y el change archivado conserva el porqué. La spec viva no se edita a mano fuera de ese sync. La excepción conocida es `## Purpose`, que ningún delta puede modificar.
4. **Norma nueva que introduce este ADR, no una práctica vigente:** si el código y la spec discrepan, es un defecto de uno de los dos y se resuelve con un change, sin dejar la discrepancia sin dueño. Hoy ninguna otra descripción del sistema se deriva de la spec: el registro de rutas de `.adonisjs/client/registry/` se genera del código y `CLAUDE.md` se escribe a mano.

**Alternativas que el repositorio permite y este ADR no evalúa a fondo:** tests de integración como fuente de verdad ejecutable (el commit `fd8946a` ya cubre `auth` así); editar la spec directamente, sin changes (es lo que ocurrió en `209df12`); y derivar el contrato de la API del código.

## Consecuencias

### Lo que ganamos

- Un solo sitio donde leer qué hace cada capability, en el lenguaje del producto y no en el del código.
- Cada cambio de comportamiento deja un delta que enseña qué requisitos se añaden o se reescriben, y un change archivado que explica por qué.
- Las decisiones y sus alternativas descartadas quedan escritas en `design.md`, junto con lo que se dejó fuera a propósito y los riesgos.
- El agente trabaja con contexto estable y verificable: scenarios concretos en vez de una descripción vaga.

### Lo que nos cuesta

- **La spec no se hace cumplir sola, y ya ha divergido del código.** Primero fue el filtro por estado (arriba). Después, el commit `8c15707` cambió `listTasksValidator` de `vine.enum(TASK_STATUSES).optional()` a `vine.string().optional()`. La spec exige `422` para un estado inventado (`spec.md:646-651`) y el código responde `200` con lista vacía. El `design.md` archivado decía que quitar el validador sería «un cambio que se ve», y se hizo en un refactor sin que nada avisara. El comentario de `validators/task.ts:22-26` sigue diciendo que un estado inventado «jamás sale por aquí como lista vacía».
- **Sin tests, la spec es una promesa sin comprobar.** Ninguno de los 124 scenarios de `tasks` tiene un test, y los tres changes archivados declaran «sin tests» como decisión explícita. Esta decisión no los exige.
- **Nadie hace cumplir la norma.** No hay CI, ni script de `package.json` que valide los changes contra la spec, ni dueño del punto 4. El sync lo hace un agente y no se comprueba en ningún otro sitio.
- **El sync se puede omitir, por descuido o por decisión.** En la historia de esta rama solo dos commits tocan `openspec/`. Hasta `209df12`, la spec viva tenía 14 requisitos, los de `add-task-list`: no recogía ni la fecha de vencimiento (cuyo change seguía sin archivar) ni el filtro.
- **La spec viva no se reconstruye desde los deltas.** Solo 4 de los 19 requisitos de `auth` pasan por un change archivado. Para los otros 15 no hay «porqué» guardado.
- **Un `MODIFIED` reescribe el requisito entero.** Los deltas de `add-task-status-filter` reescriben por completo 4 requisitos con sus 20 scenarios, y `Una sola vista de tareas, sin señales de presencia` se modifica en dos changes distintos. El delta se lee bien, pero duplica texto y abre la puerta a que delta y spec viva se separen.
- **Hay una ceremonia por cada cambio**: proposal, design, tasks y deltas, incluso para los pequeños. Si el código sale antes que el change, la spec se escribe a posteriori y deja de guiar nada, como pasó con `add-task-status-filter`.
- **La spec es larga y mezcla capas.** `tasks` junta en un solo archivo la API y la pantalla: 56 de los 124 scenarios son de interfaz (los de los requisitos cuyo enunciado empieza por «La interfaz») y 68 de API. Algunos son negativos, como «no existe ninguna vista de tareas propias separada de la lista del equipo» (`spec.md:295`), y cuesta verificarlos de forma mecánica.
- **`openspec/config.yaml` no codifica nada del proyecto**: el contexto y las reglas están en comentarios de plantilla, así que las reglas del flujo viven en las skills y en las costumbres.
- **Dependemos de la herramienta y de su formato** (`ADDED`/`MODIFIED`/`REMOVED`, la estructura de carpetas, las skills). Cambiar de herramienta supone migrar las specs.
