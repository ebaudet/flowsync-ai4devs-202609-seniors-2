# 2. Los tests de integración pasan a ser la única fuente de verdad ejecutable

## Estado

Aceptada, 2027-10-12, condicionada a los supuestos 1 y 2 del contexto. **La fecha y la aceptación son supuestas**: este ADR se escribe como si hubiera pasado un año desde el [ADR 0001](0001-openspec-como-fuente-de-verdad.md), al que **reemplaza**. A 2026-10-12, fecha del 0001, esa decisión no se ha tomado y el 0001 sigue vigente.

## Contexto

Este ADR parte de un supuesto: dentro de un año se deja de mantener OpenSpec. Distingue dos cosas. El **punto de partida** es lo que se comprobó en el repositorio el 2026-10-12, y es lo único que se sabe. Los **supuestos** son lo que tendría que haber pasado entre esa fecha y la de este ADR; ninguno se ha comprobado.

**Punto de partida (2026-10-12)**

- El ADR 0001 ya registró los costes de usar las specs como fuente de verdad: la spec viva divergió del código dos veces, y ni el sync de los deltas ni la norma de resolver cada discrepancia con un change los hace cumplir nada. No hay CI en el repositorio (no existe `.github/`).
- `backend/tests/functional/auth/` tiene cuatro ficheros y 20 tests que se ejecutan con `npm test`. El docblock de cada fichero cita el requisito de `openspec/specs/auth/spec.md` que cubre, y el título de cada test es una frase de scenario.
- En esa fecha, la capability `tasks` no tiene ningún test en esta rama: ninguno de sus 124 scenarios está cubierto. 68 son de API, y son los candidatos naturales a test de integración. Los otros 56 son de interfaz.
- El frontend no tiene runner de tests instalado.
- La suite `functional` pega contra el mismo fichero SQLite que el servidor de desarrollo (`config/database.ts` no tiene override por entorno), y por eso los tests aíslan con una transacción global.
- El README ancla el material en la spec viva (apartados «Abre `openspec/specs/`» y «El ancla de todo es la **spec viva**»), y las siete skills `openspec-*` de `.claude/skills/` siguen operativas.

**Supuestos para 2027**

1. Que los scenarios de API de `tasks` se hayan convertido en tests.
2. Que exista un CI que ejecute la suite en cada cambio.
3. Que el equipo haya decidido que mantener las specs ya no compensa.

## Decisión

Los tests de integración del backend, `backend/tests/functional/`, son la única fuente de verdad ejecutable de lo que FlowSync hace:

1. **Un comportamiento existe si un test lo afirma.** Cada capability tiene su carpeta (`functional/auth/`, `functional/tasks/`). El título de cada test es la frase del scenario que afirma, como en `auth`, y el docblock del fichero nombra el requisito.
2. **Se deja de mantener `openspec/specs/`.** No se abren más changes de OpenSpec ni se sincronizan deltas. La carpeta `openspec/` queda **congelada y de solo lectura**, con un aviso en la cabecera de cada spec, y no se borra: los changes archivados siguen guardando el porqué de lo decidido hasta entonces. Las specs congeladas pueden contradecir el sistema y ya no son una autoridad.
3. **El test va primero.** Un cambio de comportamiento empieza por el test que lo afirma, que falla, y termina cuando pasa. Una discrepancia entre lo que se espera y lo que se hace es un test rojo. Esto sustituye al punto 4 del ADR 0001 y **depende del supuesto 2**.
4. **Lo que un test de integración del backend no puede afirmar queda sin fuente de verdad ejecutable.** Es el caso de la interfaz mientras el frontend no tenga runner, y este ADR no pretende cubrirlo.

**Esta decisión obliga a hacer lo siguiente, y nada de ello está hecho:**

- Crear el CI que ejecute la suite.
- Resolver el override de la base de datos por entorno, para que la suite deje de compartir el SQLite del servidor de desarrollo.
- Convertir en tests los 68 scenarios de API de `tasks`.
- Retirar o marcar como obsoletas las skills `openspec-*` y reescribir el README, que hoy ancla el material en la spec viva.
- Reescribir los docblocks de `tests/functional/auth/` para que dejen de remitir a una spec congelada.

**Alternativas.**

- *Seguir con OpenSpec*, como dice el ADR 0001. Se descarta por la premisa de este ADR (supuesto 3) y por los costes que el propio 0001 ya recoge.
- *Mantener specs y tests a la vez.* Es la alternativa más fuerte: los docblocks actuales ya trazan cada test a su requisito, así que un híbrido barato existe. No se adopta por la premisa de dejar de mantener las specs, y habría que reabrirla si el supuesto 3 deja de ser cierto.
- *Mantener specs solo para lo que no se testea* (los 56 scenarios de interfaz y los requisitos negativos). Deja viva justo la parte más difícil de mantener.
- *Añadir un chequeo de trazabilidad en CI entre scenarios y tests.* Exige mantener las specs, es decir, lo que este ADR deja de hacer.
- *Derivar el contrato de la API del código*, por ejemplo del registro de `.adonisjs/client/registry/`. Dice qué hace el código, no qué se pretendía.

## Consecuencias

### Lo que ganamos

- Una cosa que se pone en rojo cuando algo cambia, **solo para lo que tenga test**. La divergencia del commit `8c15707` (ver el ADR 0001) es justo un caso sin test, y esta decisión no la habría puesto en rojo por sí sola.
- Desaparecen la ceremonia por cada cambio, el paso de sincronización que se podía omitir y los deltas que reescriben un requisito entero.
- El agente y las personas verifican contra algo que se ejecuta.
- La spec deja de ser un tercer sitio que mantener junto al código y los tests.

### Lo que nos cuesta

- **Lo que no tiene test no existe.** Un test solo dice lo que alguien escribió. La decisión depende de que el supuesto 1 se haya cumplido, y sin él quedan 124 scenarios de `tasks` sin comprobar.
- **Los 56 scenarios de interfaz se quedan sin sitio.** Mientras el frontend no tenga runner, nada ejecutable describe lo que hace la pantalla.
- **Tests verdes no es lo mismo que correcto.** Un test puede fijar un bug y seguir en verde, y sin una spec a la que contrastarlo nada dice que esté mal. Según el README, la revisión adversarial se contrasta contra la spec viva y perdería esa referencia; la definición del subagente cita `AGENTS.md`, que no cambia.
- **Los tests se acoplan a la implementación**, porque un test describe cómo responde el código y no la intención que había detrás.
- **Perdemos el lenguaje del producto.** Un scenario `WHEN`/`THEN` lo lee quien no programa. Un test es código.
- **Perdemos los requisitos negativos.** Cosas como «no existe ninguna vista de tareas propias separada de la lista del equipo» no se afirman fácilmente con un test.
- **El porqué se queda en un archivo congelado.** Las decisiones nuevas solo tienen los ADR y los mensajes de commit, y no un sitio por requisito.
- **La norma depende de un CI que habría que crear.** Si el supuesto 2 no se cumple, un test rojo es tan fácil de ignorar como una spec que miente. Además, «congelada y de solo lectura» no tiene ningún mecanismo que lo haga cumplir, como tampoco lo tenía la norma del ADR 0001.
- **El aislamiento pasa a ser crítico.** Si la suite es la única fuente de verdad, un estado que se filtra entre ejecuciones produce falsos rojos y falsos verdes.
- **Hay que reescribir material que hoy cuelga de la spec**: el README, las skills `openspec-*` y los docblocks de los tests.
- **Volver atrás sale caro.** Si se retoman las specs, habrá que reconstruirlas desde un archivo congelado y desde los tests, sin el historial de cambios de ese año.
