# Auditoría de reglas de proceso (eb)

Auditoría de la sección «Reglas de proceso» de `CLAUDE.md`, contrastada con los 15 últimos commits del repositorio y al estado actual de los ficheros.

> Nota: `CLAUDE.md:130` agrupa dos reglas distintas (la política de ramas y la prohibición de commitear en `main`/`sN/*`). Como se observan con pruebas diferentes, van en dos filas separadas.

## Tabla

| Regla de proceso | archivo:línea | ¿Respetada? | Cómo observarla |
|---|---|---|---|
| Una rama por unidad de trabajo: antes de tocar código, mirar en qué rama estás; si ya es una rama de trabajo (cualquiera que no sea `main` ni una `sN/*`), seguir en ella en vez de crear otra; solo desde `main` o desde una `sN/*` se abre una rama nueva (`git checkout -b feat/<slug>`). | `CLAUDE.md:130` | Ni idea | Por ahora, las ramas se han fusionado en main. |
| Nunca commitear directamente en `main` ni en una `sN/*`. | `CLAUDE.md:130` | Ni idea, parece que sí | Si le digo que lo haga, no creo que me vaya a bloquear. |
| El commit sí es por petición: al cerrar cada una, hacer el commit usando la skill `/commit`. | `CLAUDE.md:131` | Parece que sí | Cada commit parece bastante unitario. |
| Un cambio que toca rutas, controladores, validadores o transformers de una capability se cierra en el mismo commit con el documento OpenAPI al día (lo que se commitea es el diff regenerado de `.adonisjs/`) y con el README de esa capability (`docs/capabilities/<nombre>/README.md`). | `CLAUDE.md:132` | No | El commit ea5db1f0ce3fa567aa8779c42739f50b8c63a654 no lo hizo. |
| `gh pr create` (con una descripción completa de los cambios en el cuerpo del PR) y el paso del subagente `adversarial-reviewer` van una sola vez, al terminar la unidad de trabajo, no al cerrar cada petición; el review adversarial es lo último antes de dar la unidad por terminada. | `CLAUDE.md:133` | Sí, pero no se puede ver con los commits | Se ve cuando se hacen los commits, que tardan bastante más en ejecutarse con el `adversarial-reviewer`, pero después no queda ninguna traza en el historial. |
| Al abrir el PR, no repetir ese resumen en el chat: la sesión se pierde, el PR no; responder solo con la URL del PR. | `CLAUDE.md:134` | Ni idea | No se puede comprobar con los commits. |

## Parte B: las tres líneas

1. **La regla en la que más me equivoqué:** ...
2. **Una regla imposible de verificar con la información disponible:** ...
3. **La regla que eliminaría, y por qué:** ...

## Parte C: auditoría con evidencia (15 últimos commits)

Alcance: `git log -15` desde `auditoria-eb` (de `b955a72` a `eff1686`). Esos 15 commits son la historia de referencia publicada en `upstream/s4/end` = `s5/start` (12 de Earvin Saúl Pérez Ramos, 3 de LIDR). Cada commit se mide contra la regla que estaba **vigente cuando se hizo**: `0e56705` reescribe `CLAUDE.md:130-133` (antes: rama nueva y PR por tarea) y `160fbc7` añade `CLAUDE.md:132`.

| Qué pide la regla | Fichero:línea | Qué se revisó para comprobarla | Veredicto | Evidencia | Qué harías con ella |
|---|---|---|---|---|---|
| Se trabaja en una rama por unidad de trabajo: se sigue en la rama de trabajo actual y solo se abre `feat/<slug>` estando en `main` o en una `sN/*`. | `CLAUDE.md:130` | `git log -16 --graph --oneline --decorate`; `git branch -a --contains <sha>` para cada uno de los 15 commits | No se puede comprobar | La historia es lineal y sin merges, y los 15 commits solo son alcanzables desde `s4/end`, `s5/start` y `auditoria-eb`. Git no guarda en qué rama nació cada commit y la regla no define qué es una «unidad de trabajo». | Dejarla, porque es una pauta de criterio. Su parte comprobable se cubre en la fila de `sN/*`. |
| No se commitea nunca directamente en `main`. | `CLAUDE.md:130` | `git log --oneline main`; `git branch -a --contains <sha>` | Se cumple | `main` solo contiene `9fe0143 Initial commit`, y ninguno de los 15 commits es alcanzable desde `main` ni desde `origin/main`. | Convertirla en comprobación automática: protección de rama en GitHub y hook `pre-commit` que rechace commits en `main`. |
| No se commitea nunca directamente en una rama `sN/*`. | `CLAUDE.md:130` | `git log --graph` (no hay merges en el rango); `git branch -a --contains`; fechas con `git log --format='%h %ad'` | No se puede comprobar | Los 15 commits están en `s4/end`/`s5/start` sin ningún merge commit, y un commit directo deja la misma historia que un fast-forward o un rebase. Además, `b955a72`/`afc4b74` (fechados el 28-ago) aparecen antes que commits del 20-ago, así que la historia se reescribió. | Convertirla en comprobación automática: proteger `s*/*` en GitHub para exigir PR, y añadir un hook `pre-commit` local. |
| Cada petición se cierra con su propio commit, hecho con la skill `/commit`. | `CLAUDE.md:131` | `git log -15 --format='%h %an %s%n%b'`; `.claude/skills/commit/SKILL.md` (pide `tipo(scope): descripción`) | No se puede comprobar | Git no registra ni las peticiones ni el uso de la skill. 14/15 asuntos siguen `tipo(scope):`, pero `eff1686` es `docs:` sin scope. 3/15 (`b955a72`, `afc4b74`, `eff1686`) no llevan `Co-Authored-By: Claude`, así que no los hizo el agente. | Convertirla en comprobación automática: hook `commit-msg`/commitlint para el formato. La parte «uno por petición» no se puede verificar. |
| Si un cambio toca rutas, controladores, validadores o transformers de una capability, ese mismo commit tiene que incluir el diff regenerado de `.adonisjs/` y el `docs/capabilities/<nombre>/README.md` al día. | `CLAUDE.md:132` | `git show --stat 160fbc7..cbe9617 -- backend/app/{controllers,validators,transformers} backend/start/routes.ts`; `git show --stat` de `4e03d1f`, `ea5db1f`, `cbe9617`; `backend/.adonisjs/client/registry/schema.d.ts` | Se cumple | Desde que existe la regla (`160fbc7`), el único commit afectado es `cbe9617`, y trae `docs/capabilities/tasks/README.md`. No trae diff de `.adonisjs/`, pero tampoco hacía falta: no cambia ninguna ruta y el registry saca los tipos con `ReturnType<import('#controllers/…')>`. | Convertirla en comprobación automática: un CI que falle si se tocan esas carpetas sin tocar el README, y que regenere `.adonisjs/` y exija `git diff --exit-code`. |
| `gh pr create` se ejecuta una sola vez, al terminar la unidad de trabajo, y el cuerpo describe todos los cambios. | `CLAUDE.md:133` | `gh pr list -R ebaudet/flowsync-ai4devs-202609-seniors-2 --state all`; `gh pr list -R LIDR-academy/flowsync-ai4devs-202609-seniors-2` | No se puede comprobar | Ningún PR de `origin` contiene estos 15 SHA y el repo `upstream` no es accesible («Could not resolve to a Repository»). Git no guarda PRs. | Dejarla, pero definiendo qué es una «unidad de trabajo». Sin esa definición no se puede decir si sobra un PR. |
| El subagente `adversarial-reviewer` revisa el PR una sola vez y es el último paso antes de dar la unidad por terminada. | `CLAUDE.md:133` | Búsqueda de rastros del review en `git log -15 --format=%B`; `gh pr view <n> --json commits,comments` para #4–#9 | No se puede comprobar | Los 15 commits no dejan rastro del review (`8f9e715` solo cambia la definición del subagente). En los PRs propios sí hay rastro y no se cumple: #4/#6 no tienen review, #7/#8 tienen dos, y en #9 hay un commit (`ab1df6d`, 15-oct) posterior al review del 12-oct. | Convertirla en comprobación automática: el subagente publica su veredicto en el PR con el SHA revisado, y un check exige que ese SHA sea el HEAD del PR. |
| Después de abrir el PR, en el chat solo se responde con su URL, sin repetir el resumen. | `CLAUDE.md:134` | Búsqueda de algún registro de la sesión en el repo y en `gh pr view` | No se puede comprobar | La respuesta en el chat no queda ni en git ni en GitHub; solo existe en la sesión, que según la propia regla se pierde. | Dejarla: no cuesta nada y no se puede automatizar, pero hay que asumir que nunca se va a verificar. |

### Observaciones sobre los commits anteriores a cada regla

- `4427afc` y `b955a72` son anteriores a `0e56705`, así que para ellos todavía regía «rama nueva + PR por tarea». En git no queda nada que permita juzgarlos con esa regla.
- `CLAUDE.md:132` no regía para `4e03d1f` (cambia `task_transformer.ts`) ni para `ea5db1f` (cambia `start/routes.ts`). `ea5db1f` es 14 min anterior a `160fbc7`, **sí** incluye el diff de `.adonisjs/`, y el README de `tasks` no existía hasta `7662fb1`. Además, las rutas que añade son las de `openapi`, no las de una capability. Por eso, decir que «`ea5db1f` no lo hizo» es aplicarle de forma retroactiva una regla que todavía no existía.
- Las reglas `CLAUDE.md:130` y `:132` se añadieron en el mismo rango que se audita (`0e56705`, `160fbc7`). En los PRs propios pasa igual: #5 (`376f9d7`) y #9 (`c76cac2`) introducen las reglas a la vez que el trabajo que deberían regular.


---

## Parte B

- La regla en la que más te equivocaste:
Línea 132, me equivoqué, que lo pedí al agente, que aún no existía la regla, así que el casó de error estaba equivocado.

- Una regla que no se puede comprobar con la información disponible:

> Al abrir el PR, no repetir ese resumen en el chat: la sesión se pierde, el PR no; responder solo con la URL del PR

Mirando el historial, no se puede, pero son cosas que se ve al cada día, así que no me parece grave si no se cumple. Es más practico por quién lo lea, y si se deja de cumplirse y nadie se da cuenta, es que no estaba tán importante.

- La regla que eliminarías y por qué:

> Nunca commitear directamente en `main` ni en una `sN/*`.

Para mí, hay que protejer más a fundo, para que todo el equipo, los desarolladores incluidos no incluemplen esta regla.
Y en este caso, se bloquea más a un nivel de hook de git.
 Ejemplo con `.git/hooks/pre-commit` :
```sh
#!/bin/sh

branch=$(git symbolic-ref --short HEAD)

if [ "$branch" = "main" ]; then

    echo "❌ Commits interdits sur main. Crée une branche."

    exit 1

fi
```
