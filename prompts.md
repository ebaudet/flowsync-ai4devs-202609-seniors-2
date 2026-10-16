# Prompts

Aquí van **todos los prompts que lanzaste** para hacer el ejercicio, en el orden en que los
lanzaste, con el modelo y la herramienta de cada uno.

Esto no es papeleo. Lo que se revisa es **cómo pediste las cosas**, no solo lo que salió: un
resultado flojo con un prompt bueno y un resultado flojo con un prompt vago necesitan feedback
distinto, y sin este archivo no se distinguen.

## Cómo rellenarlo

- Un apartado `## Prompt N` por cada prompt.
- **Pega el prompt tal cual lo lanzaste**, dentro del bloque de código, aunque ocupe diez líneas
  y aunque tenga faltas. No lo reescribas para que quede bien: el que arreglaste mentalmente
  después no es el que lanzaste.
- Incluye también los que **no funcionaron**. Suelen ser los más útiles de leer.
- `Modelo` y `Herramienta` en todos. Si cambiaste de una a otra a mitad, se nota aquí.

Borra el ejemplo de abajo cuando escribas el primero.

---

> Sesión de Claude Code `ac197141-c3d4-4939-955f-18ad72a88562` (2026-10-16), rama `auditoria-eb`.
> Las cifras salen del transcript (`~/.claude/projects/-Users-ebaudet-rendu-tutorials-lidr-m05-exercice/ac197141-….jsonl`): modelo y `perTurnEffort` de cada petición, `turn_duration` del turno y el `usage` de cada request a la API.
> Precio calculado con la tarifa de API de Claude Opus 5.5: 4 $/MTok de entrada, 20 $/MTok de salida, 8 $/MTok de escritura de caché a 1 h (2×) y 0,20 $/MTok de lectura de caché. Es el coste equivalente en API; con una suscripción no se factura así.

## Prompt 1

**Modelo:** Claude Opus 5.5 (`claude-opus-5-5`)
**Nivel:** high
**Herramienta:** Claude Code
**Duración:** 2 min 43 s (8 llamadas a la API)
**Precio:** 0,78 $ (14 128 tokens de salida, 51 185 de escritura de caché, 442 802 de lectura de caché, 16 de entrada)

```
Mira los 15 últimos commits y, con estos datos, comprueba las reglas del CLAUDE.md.

Rellena una tabla en `docs/auditoria/eb.md` (al final del archivo) con las columnas siguientes: | Qué pide la regla | Fichero:línea | Qué se revisó para comprobarla | Veredicto | Evidencia | Qué harías con ella |

La meta es hacer una auditoría lo más objetiva posible de lo que se puede averiguar sobre si se cumplieron correctamente o no las reglas del CLAUDE.md, echando un ojo a los commits anteriores.

No hay que corregir nada, solamente dejar las anotaciones en ese fichero.



Qué pide la regla. Resúmela en una frase y con tus propias palabras. Si necesitas varias frases, puede que estés mezclando más de una regla.
Qué se revisó para comprobarla. Indica el comando ejecutado o el archivo consultado. Sin esta información no hay forma de saber en qué se apoya el veredicto.
Veredicto. Solo puede ser se cumple, no se cumple o no se puede comprobar con la información disponible. Este último caso también es un resultado válido. Significa que la regla no deja suficiente evidencia para verificarla.
Evidencia. Escríbela en una línea. Si la regla no se cumple, indica dónde se incumple. Si no se puede comprobar, explica qué información falta.
Qué harías con ella. Elige una opción: dejarla, borrarla o convertirla en una comprobación automática.
```

**Qué salió:** funcionó a la primera: añadió la «Parte C» a `docs/auditoria/eb.md` con 8 filas (2 «se cumple», 6 «no se puede comprobar») y observaciones sobre los commits anteriores a cada regla.

## Prompt 2

**Modelo:** Claude Opus 5.5 (`claude-opus-5-5`)
**Nivel:** high
**Herramienta:** Claude Code
**Duración:** 20 s (2 llamadas a la API)
**Precio:** 0,08 $ (1 541 tokens de salida, 2 613 de escritura de caché, 153 825 de lectura de caché, 4 de entrada)

```
Dices que la regla `CLAUDE.md:132` se cumple, pero el commit ea5db1f0ce3fa567aa8779c42739f50b8c63a654 trae un diff de `.adonisjs/` y no trae el README.md [Image #2]

¿O estoy entendiendo mal la regla?
```

(Adjunta una captura de los ficheros de `ea5db1f` en el cliente git.)

**Qué salió:** respuesta en el chat, sin cambios en ficheros: los hechos eran correctos, pero el veredicto se mantiene (la regla es 14 min posterior al commit, las rutas son de `openapi` y no de una capability, y el README de `tasks` aún no existía). Señaló la ambigüedad de «ruta de una capability».

## Prompt 3

**Modelo:** Claude Opus 5.5 (`claude-opus-5-5`)
**Nivel:** high
**Herramienta:** Claude Code
**Duración:** en curso al escribir este fichero (≥ 48 s de generación en 7 llamadas a la API)
**Precio:** ≥ 0,61 $ medido hasta antes de escribir este fichero (3 723 tokens de salida, 50 951 de escritura de caché, 620 571 de lectura de caché, 14 de entrada). Cargar la skill `claude-api` para sacar los precios añadió unos 50 k tokens de contexto.

```
Guarda los prompts de esta sesión (con el modelo utilizado, el nivel, la duración y el precio de cada prompt) en un fichero `prompts.md` en la raíz del proyecto.
```

**Qué salió:** este fichero.

---

**Total medido:** ≥ 1,47 $ en unos 4 min de generación (los prompts 1 y 2 completos y el 3 parcial).
