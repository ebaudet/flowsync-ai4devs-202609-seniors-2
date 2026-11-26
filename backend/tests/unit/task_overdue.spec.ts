import Task, { type TaskStatus } from '#models/task'
import { test } from '@japa/runner'

/**
 * La regla de «vencida» (`Task.isOverdueOn`) llamada directamente, sin servidor y sin
 * base de datos: el modelo se construye en memoria y no se guarda. Aquí salen baratos
 * los bordes; el contrato visto desde HTTP vive en
 * `tests/functional/tasks/overdue.spec.ts`.
 *
 * Ningún caso lee el reloj: el día de referencia es una constante.
 */
const HOY = '2026-08-20'

function tarea(status: TaskStatus, dueDate: string | Date | null): Task {
  const task = new Task()
  task.status = status
  // `dueDate` se declara `string | null`, pero el controlador de `pg` entrega un `Date`
  // en las columnas `DATE`. El cast deja probar las dos formas sin tocar el tipo.
  task.dueDate = dueDate as string | null
  return task
}

/**
 * Un día del calendario como lo construye `pg` al leer una columna `DATE`: un `Date` a
 * medianoche en hora LOCAL del proceso. Se construye con los componentes locales y no
 * con `new Date('2026-08-19')`, que sería medianoche UTC y movería el día en husos al
 * oeste de Greenwich.
 */
const comoFecha = (anio: number, mes: number, dia: number) => new Date(anio, mes - 1, dia)

test.group('Task.isOverdueOn | la regla', () => {
  test('fecha anterior al día de referencia y tarea no hecha: vencida', ({ assert }) => {
    for (const status of ['pending', 'in_progress'] as const) {
      assert.isTrue(tarea(status, '2026-08-19').isOverdueOn(HOY), status)
    }
  })

  test('fecha exactamente el día de referencia: no vencida (la regla exige anterior)', ({
    assert,
  }) => {
    assert.isFalse(tarea('pending', HOY).isOverdueOn(HOY))
  })

  test('fecha posterior al día de referencia: no vencida', ({ assert }) => {
    assert.isFalse(tarea('pending', '2026-08-21').isOverdueOn(HOY))
  })

  test('sin fecha: no vencida', ({ assert }) => {
    for (const status of ['pending', 'in_progress', 'done'] as const) {
      assert.isFalse(tarea(status, null).isOverdueOn(HOY), status)
    }
  })

  test('hecha, con la fecha ya pasada: no vencida', ({ assert }) => {
    assert.isFalse(tarea('done', '2026-08-19').isOverdueOn(HOY))
  })

  test('el borde entre meses y años no cambia la regla', ({ assert }) => {
    assert.isTrue(tarea('pending', '2026-07-31').isOverdueOn('2026-08-01'))
    assert.isFalse(tarea('pending', '2026-08-01').isOverdueOn('2026-08-01'))
    assert.isTrue(tarea('pending', '2025-12-31').isOverdueOn('2026-01-01'))
  })
})

/**
 * No sale de la spec sino de cómo llega el dato de verdad: `pg` devuelve las columnas
 * `DATE` como objetos `Date`, y la regla tiene que dar el mismo veredicto que con el
 * texto `AAAA-MM-DD` que declara el esquema. Cada caso se prueba con las dos formas.
 */
test.group('Task.isOverdueOn | la fecha llega como texto o como objeto de fecha', () => {
  const casos = [
    { nombre: 'anterior', texto: '2026-08-19', fecha: comoFecha(2026, 8, 19), vencida: true },
    { nombre: 'el mismo día', texto: '2026-08-20', fecha: comoFecha(2026, 8, 20), vencida: false },
    { nombre: 'posterior', texto: '2026-08-21', fecha: comoFecha(2026, 8, 21), vencida: false },
  ]

  for (const caso of casos) {
    test(`fecha ${caso.nombre}: mismo veredicto con texto y con Date`, ({ assert }) => {
      const conTexto = tarea('pending', caso.texto).isOverdueOn(HOY)
      const conFecha = tarea('pending', caso.fecha).isOverdueOn(HOY)

      assert.equal(conTexto, caso.vencida, 'con texto')
      assert.equal(conFecha, caso.vencida, 'con objeto Date')
    })
  }

  test('hecha, con la fecha pasada como Date: no vencida', ({ assert }) => {
    assert.isFalse(tarea('done', comoFecha(2026, 8, 19)).isOverdueOn(HOY))
  })
})
