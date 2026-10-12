# 2. Los tests de integración pasan a ser la única fuente de verdad ejecutable

## Estado

Aceptada, 2027-10-12. La fecha es supuesta: este ADR se escribe como si hubiera pasado un año desde el [ADR 0001](0001-openspec-como-fuente-de-verdad.md), al que **reemplaza**.

## Contexto

Este ADR parte de un supuesto: dentro de un año se deja de mantener OpenSpec. Por eso el contexto separa lo que se puede comprobar hoy en el repositorio de lo que el ADR da por supuesto.

**Lo que se comprueba hoy**

- El ADR 0001 ya registró los costes de usar las specs como fuente de verdad. La spec viva ha divergido del código dos veces: el filtro por estado se implementó sin actualizarla y el commit `8c15707` quitó el enum del validador de `status` sin que nada avisara, así que hoy la spec exige un `422` que el código no da.
- Ni el sync de los deltas ni la norma de que una discrepancia se resuelve con un change los hace cumplir nada: el sync lo hace un agente, y no hay CI (no existe `.github/`).
- `backend/tests/functional/auth/` tiene cuatro ficheros y 20 tests que ya se ejecutan con `npm test`. Cada fichero cita en su docblock el requisito de `openspec/specs/auth/spec.md` que cubre.
- En esta rama, la capability `tasks` no tiene ningún test: ninguno de sus 124 scenarios está cubierto. 68 son de API, y son los candidatos naturales a test de integración. Los otros 56 son de interfaz.
- El frontend no tiene runner de tests instalado.
- La suite `functional` pega contra el mismo fichero SQLite que el servidor de desarrollo (`config/database.ts` no tiene override por entorno), y por eso los tests aíslan con una transacción global.

**Lo que este ADR da por supuesto, sin poder comprobarlo hoy**

- Que para entonces los scenarios de API de `tasks` se hayan convertido en tests.
- Que exista un CI que ejecute la suite en cada cambio.
- Que el equipo haya decidido que mantener las specs ya no compensa.

## Decisión

Los tests de integración del backend, `backend/tests/functional/`, son la única fuente de verdad ejecutable de lo que FlowSync hace:

1. **Un comportamiento existe si un test lo afirma.** Cada capability tiene su carpeta (`functional/auth/`, `functional/tasks/`), y el título de cada test es la frase del requisito, en castellano, como hoy.
2. **Se deja de mantener `openspec/specs/`.** No se abren más changes de OpenSpec ni se sincronizan deltas. La carpeta `openspec/` queda **congelada y de solo lectura**, con un aviso en la cabecera de cada spec, y no se borra: los changes archivados siguen guardando el porqué de lo decidido hasta ahora. Las specs congeladas pueden contradecir el sistema, y ya no son una autoridad.
3. **El test va primero.** Un cambio de comportamiento empieza por el test que lo afirma, que falla, y termina cuando pasa. Una discrepancia entre lo que se espera y lo que se hace es un test rojo. Esto sustituye al punto 4 del ADR 0001 y presupone un CI que hoy no existe.
4. **Lo que un test de integración del backend no puede afirmar queda sin fuente de verdad ejecutable.** Es el caso de la interfaz mientras el frontend no tenga runner, y este ADR no pretende cubrirlo.

**Alternativas.** Seguir con OpenSpec, que es lo que decía el ADR 0001. Mantener specs y tests a la vez, con el coste doble de mantener dos descripciones que hay que mantener iguales. Derivar el contrato de la API del código, que no dice qué se pretendía, solo qué hace.

## Consecuencias

### Lo que ganamos

- Una sola cosa que se pone en rojo cuando algo cambia, en lugar de una spec que puede mentir sin que nada falle.
- Desaparecen la ceremonia por cada cambio, el paso de sincronización que se podía omitir y los deltas que reescriben un requisito entero.
- El agente y las personas verifican contra algo que se ejecuta.
- La spec deja de ser un tercer sitio que mantener junto al código y los tests.

### Lo que nos cuesta

- **Lo que no tiene test no existe.** Un test solo dice lo que alguien escribió. La spec congelada tiene 124 scenarios de `tasks` que hoy no tienen ni uno. Convertirlos en tests es trabajo por hacer, y la decisión depende de que se haya hecho.
- **Los 56 scenarios de interfaz se quedan sin sitio.** Mientras el frontend no tenga runner, nada ejecutable describe lo que hace la pantalla.
- **Tests verdes no es lo mismo que correcto.** Un test puede fijar un bug y seguir en verde. Sin una spec a la que contrastarlo, nada dice que el test esté mal. La revisión adversarial del proyecto se contrasta hoy contra la spec viva, y pierde esa referencia.
- **Perdemos el lenguaje del producto.** Un scenario `WHEN`/`THEN` lo lee quien no programa. Un test es código.
- **Perdemos los requisitos negativos.** Cosas como «no existe ninguna vista de tareas propias separada de la lista del equipo» no se afirman fácilmente con un test.
- **El porqué se queda en un archivo congelado.** Las decisiones nuevas solo tienen los ADR y los mensajes de commit, y no un sitio por requisito.
- **La norma depende de un CI que no existe.** Sin él, un test rojo es tan fácil de ignorar como una spec que miente.
- **El aislamiento pasa a ser crítico.** La suite comparte el SQLite del servidor de desarrollo. Si es la única fuente de verdad, un estado que se filtra entre ejecuciones produce falsos rojos y falsos verdes, y hay que resolver el override de la base de datos por entorno.
- **Los docblocks de los tests actuales apuntan a un documento congelado.** Los de `tests/functional/auth/` dicen «Cubre los requisitos… de `openspec/specs/auth/spec.md`». Hay que reescribirlos o aceptar que son una referencia histórica.
- **Volver atrás sale caro.** Si algún día se retoman las specs, habrá que reconstruirlas desde un archivo congelado y desde los tests, sin el historial de cambios de ese año.
