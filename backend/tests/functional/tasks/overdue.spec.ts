import User from '#models/user'
import Task from '#models/task'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Requirement «Cuándo una tarea está vencida» de `openspec/specs/tasks/spec.md`. Un test
 * por Scenario, entrando por HTTP y mirando solo `isOverdue` (y `dueDate` donde el
 * Scenario lo pide) en el cuerpo de la respuesta:
 *
 *   1  Fecha del día anterior                    5  Darla por hecha la deja de vencer
 *   2  Vencer hoy todavía no es estar vencida    6  Una tarea hecha con la fecha pasada
 *   3  Fecha futura                              7  Aplazar resuelve el vencimiento
 *   4  Sin fecha no se vence nunca
 *
 * Ningún test lee el reloj del sistema: el día de referencia es una constante que se le
 * pasa a cada petición en `today`, y las fechas de las tareas se derivan de ella a mano.
 * Los identificadores son los que devuelve la creación.
 */
test.group('Tasks | cuándo una tarea está vencida', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // El día de quien mira. El resto de fechas se escriben respecto a este.
  const HOY = '2026-08-20'
  const AYER = '2026-08-19'
  const MANANA = '2026-08-21'

  async function persona(client: any, email: string, fullName: string) {
    const user = await User.create({ fullName, email, password: 'secreto123' })
    const login = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return { user, token: login.body().data.token as string }
  }

  const con = (token: string) => ({ Authorization: `Bearer ${token}` })

  function tareaDe(
    user: User,
    datos: Partial<Pick<Task, 'title' | 'status' | 'dueDate' | 'createdAt'>> = {}
  ): Promise<Task> {
    return Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: user.id,
      ...datos,
    })
  }

  /** Consulta la tarea suelta, que es la lectura que informa del vencimiento. */
  async function consultar(client: any, token: string, id: number, today: string) {
    const response = await client.get(`/api/v1/tasks/${id}`).headers(con(token)).qs({ today })
    response.assertStatus(200)
    return response.body().data
  }

  test('Fecha del día anterior | llega marcada como vencida', async ({ client, assert }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user, { status: 'pending', dueDate: AYER })

    const dato = await consultar(client, token, tarea.id, HOY)

    assert.isTrue(dato.isOverdue)
  })

  test('Vencer hoy todavía no es estar vencida | la fecha del propio día no vence', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user, { status: 'pending', dueDate: HOY })

    const dato = await consultar(client, token, tarea.id, HOY)

    assert.isFalse(dato.isOverdue)
  })

  test('Fecha futura | no llega marcada como vencida', async ({ client, assert }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user, { status: 'pending', dueDate: MANANA })

    const dato = await consultar(client, token, tarea.id, HOY)

    assert.isFalse(dato.isOverdue)
  })

  test('Sin fecha no se vence nunca | por antigua que sea', async ({ client, assert }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    // Creada semanas antes del día de referencia, pendiente y sin fecha de vencimiento.
    const tarea = await tareaDe(user, {
      status: 'pending',
      dueDate: null,
      createdAt: DateTime.fromISO('2026-07-01T09:00:00Z'),
    })

    const dato = await consultar(client, token, tarea.id, HOY)

    assert.isNull(dato.dueDate)
    assert.isFalse(dato.isOverdue)
  })

  test('Darla por hecha la deja de vencer | y su fecha sigue siendo la misma', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user, { status: 'pending', dueDate: AYER })

    const antes = await consultar(client, token, tarea.id, HOY)
    assert.isTrue(antes.isOverdue)
    assert.equal(antes.dueDate, AYER)

    const cambio = await client
      .patch(`/api/v1/tasks/${tarea.id}/status`)
      .headers(con(token))
      .json({ status: 'done' })
    cambio.assertStatus(200)

    const despues = await consultar(client, token, tarea.id, HOY)
    assert.equal(despues.status, 'done')
    assert.isFalse(despues.isOverdue)
    assert.equal(despues.dueDate, AYER)
  })

  test('Una tarea hecha con la fecha pasada | no llega marcada como vencida', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user, { status: 'done', dueDate: AYER })

    const dato = await consultar(client, token, tarea.id, HOY)

    assert.equal(dato.status, 'done')
    assert.isFalse(dato.isOverdue)
  })

  test('Aplazar resuelve el vencimiento | en la misma respuesta del cambio', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user, { status: 'pending', dueDate: AYER })

    const antes = await consultar(client, token, tarea.id, HOY)
    assert.isTrue(antes.isOverdue)

    // La respuesta del propio cambio, sin una segunda consulta de por medio.
    const response = await client
      .put(`/api/v1/tasks/${tarea.id}/due-date`)
      .headers(con(token))
      .json({ today: HOY, dueDate: MANANA })

    response.assertStatus(200)
    assert.equal(response.body().data.id, tarea.id)
    assert.equal(response.body().data.dueDate, MANANA)
    assert.isFalse(response.body().data.isOverdue)
  })
})
