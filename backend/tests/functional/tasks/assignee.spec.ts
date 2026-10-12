import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: el responsable identificable, que la tarea no
 * filtra datos de cuenta y el responsable sin nombre.
 *
 * Cada scenario se comprueba por las dos lecturas que traen la tarea —la suelta
 * y la lista—, porque cada una la serializa con su propio transformer.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  async function sesion(client: any, email = 'miron@example.com') {
    await User.create({ fullName: 'Quien Mira', email, password: 'secreto123' })

    const response = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return response.body().data.token as string
  }

  async function tareaDe(fullName: string | null, email: string) {
    const responsable = await User.create({ fullName, email, password: 'secreto123' })

    return Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: responsable.id,
    })
  }

  /**
   * El `assignee` de la tarea tal y como llega por la lectura suelta y por la
   * lista. La suelta exige el día de quien mira; la lista no.
   */
  async function assigneesDe(client: any, token: string, tarea: Task) {
    const suelta = await client
      .get(`/api/v1/tasks/${tarea.id}`)
      .qs({ today: '2026-10-12' })
      .header('Authorization', `Bearer ${token}`)
    const lista = await client.get('/api/v1/tasks').header('Authorization', `Bearer ${token}`)

    suelta.assertStatus(200)
    lista.assertStatus(200)

    const enLista = lista.body().data.find((t: any) => t.id === tarea.id)

    return { suelta: suelta.body().data.assignee, lista: enLista.assignee }
  }

  test('el responsable llega con su nombre y sus iniciales', async ({ client, assert }) => {
    const token = await sesion(client)
    const tarea = await tareaDe('Ada Lovelace', 'ada@example.com')

    const { suelta, lista } = await assigneesDe(client, token, tarea)

    for (const assignee of [suelta, lista]) {
      assert.equal(assignee.fullName, 'Ada Lovelace')
      assert.equal(assignee.initials, 'AL')
    }
  })

  test('el responsable no trae el email ni ningún otro dato de la cuenta', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const tarea = await tareaDe('Ada Lovelace', 'ada@example.com')

    const { suelta, lista } = await assigneesDe(client, token, tarea)

    for (const assignee of [suelta, lista]) {
      assert.notProperty(assignee, 'email')
      assert.notProperty(assignee, 'password')
      assert.isEmpty(
        Object.keys(assignee).filter((campo) => !['id', 'fullName', 'initials'].includes(campo))
      )
      assert.notInclude(JSON.stringify(assignee), 'ada@example.com')
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const tarea = await tareaDe(null, 'ada@example.com')

    const { suelta, lista } = await assigneesDe(client, token, tarea)

    for (const assignee of [suelta, lista]) {
      assert.isNull(assignee.fullName)
      assert.equal(assignee.initials, 'AE')
      assert.notProperty(assignee, 'email')
    }
  })
})
