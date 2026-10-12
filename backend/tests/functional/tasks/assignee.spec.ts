import Task from '#models/task'
import User from '#models/user'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Lo que cada tarea muestra de su responsable. Cubre los tres scenarios del
 * requisito «Lo que cada tarea muestra de su responsable» de
 * `openspec/specs/tasks/spec.md`: responsable identificable, la tarea que no
 * filtra datos de cuenta, y el responsable sin nombre.
 *
 * OJO: «el responsable no incluye el email…» FALLA A PROPÓSITO. Hoy
 * `TaskTransformer` serializa el `assignee` con `UserTransformer` y la lista y
 * la creación exponen el email; solo la tarea suelta usa
 * `TaskAssigneeTransformer`. Es el defecto que este test señala: no se tapa.
 */
test.group('Tasks | responsable', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  const HOY = '2026-08-12'

  type Responsable = Record<string, unknown>

  async function sesion(client: any) {
    await User.create({
      fullName: 'Alan Turing',
      email: 'alan@example.com',
      password: 'secreto123',
    })

    const response = await client
      .post('/api/v1/auth/login')
      .json({ email: 'alan@example.com', password: 'secreto123' })

    return response.body().data.token as string
  }

  async function tareaDe(responsable: User) {
    return Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: responsable.id,
    })
  }

  /**
   * El `assignee` de la misma tarea tal y como lo entrega cada camino de la API:
   * suelta, dentro de la lista y recién creada. El cuerpo de la lista es una
   * unión de objeto y array en el tipado generado, de ahí el cast.
   */
  async function responsablesPorCamino(client: any, token: string, tareaId: number) {
    const auth = { Authorization: `Bearer ${token}` }

    const suelta = await client.get(`/api/v1/tasks/${tareaId}`).qs({ today: HOY }).headers(auth)
    const lista = await client.get('/api/v1/tasks').headers(auth)
    const creada = await client.post('/api/v1/tasks').headers(auth).json({ title: 'Otra tarea' })

    suelta.assertStatus(200)
    lista.assertStatus(200)
    creada.assertStatus(201)

    const delLista = lista.body().data as Array<{ id: number; assignee: Responsable }>

    return {
      cuerpos: [suelta.body(), lista.body(), creada.body()],
      responsables: {
        suelta: suelta.body().data.assignee as Responsable,
        lista: delLista.find((tarea) => tarea.id === tareaId)!.assignee,
        creada: creada.body().data.assignee as Responsable,
      },
    }
  }

  test('el responsable trae su nombre y sus iniciales, suficientes para saber quién la lleva', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const ada = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secreto123',
    })
    const tarea = await tareaDe(ada)

    const { responsables } = await responsablesPorCamino(client, token, tarea.id)

    for (const camino of ['suelta', 'lista'] as const) {
      assert.equal(responsables[camino].fullName, 'Ada Lovelace', camino)
      assert.equal(responsables[camino].initials, 'AL', camino)
    }
  })

  test('el responsable no incluye el email ni ningún otro dato de acceso', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)
    const ada = await User.create({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'secreto123',
    })
    const tarea = await tareaDe(ada)

    const { cuerpos, responsables } = await responsablesPorCamino(client, token, tarea.id)

    // Lista blanca: lo justo para identificarlo. Cualquier campo nuevo de la
    // cuenta que se cuele en el `assignee` hace fallar esto, no solo el email.
    for (const [camino, assignee] of Object.entries(responsables)) {
      assert.sameMembers(Object.keys(assignee), ['id', 'fullName', 'initials'], camino)
    }

    // Y el email no aparece en ningún sitio de la respuesta, ni el de la
    // responsable ni el de quien consulta.
    for (const cuerpo of cuerpos) {
      assert.notInclude(JSON.stringify(cuerpo), 'ada@example.com')
      assert.notInclude(JSON.stringify(cuerpo), 'alan@example.com')
    }
  })

  test('un responsable sin nombre llega con el nombre nulo y con iniciales', async ({
    client,
    assert,
  }) => {
    const token = await sesion(client)

    // Una cuenta que se registró sin nombre, por el registro real.
    const registro = await client.post('/api/v1/auth/signup').json({
      fullName: null,
      email: 'ada@example.com',
      password: 'secreto123',
      passwordConfirmation: 'secreto123',
    })
    registro.assertStatus(200)

    const sinNombre = await User.findByOrFail('email', 'ada@example.com')
    const tarea = await tareaDe(sinNombre)

    const { responsables } = await responsablesPorCamino(client, token, tarea.id)

    // Sin nombre, las iniciales salen del email (como en `auth/initials.spec.ts`),
    // pero el email en sí no viaja: eso lo comprueba el test anterior.
    for (const camino of ['suelta', 'lista'] as const) {
      assert.isNull(responsables[camino].fullName, camino)
      assert.equal(responsables[camino].initials, 'AE', camino)
    }
  })
})
