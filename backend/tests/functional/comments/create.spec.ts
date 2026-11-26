import User from '#models/user'
import Task from '#models/task'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Requirements de `openspec/specs/comments/spec.md` que cubren el alta de un comentario
 * (`POST /api/v1/tasks/:id/comments`). Un test por Scenario, entrando por HTTP:
 *
 * Requirement «Comentar una tarea»
 *   1  Alta con el texto como único dato
 *   2  El comentario nace a nombre de quien lo envía
 *   3  Comentar no cambia la tarea
 *   4  Una tarea que no existe no se comenta
 *   5  Sin sesión no se comenta
 *
 * Requirement «Ningún comentario vacío ni excesivo»
 *   6  Texto ausente, vacío o de solo espacios
 *   7  Texto demasiado largo
 *   8  Los espacios de los extremos no cuentan
 *
 * Requirement «Un mismo comentario no se repite seguido»
 *   9  El mismo texto dos veces seguidas
 *   10 Lo repetido pero no seguido sí se admite
 *   11 Otra cuenta puede decir lo mismo
 *
 * Fuera de este fichero, a propósito: el Requirement «Leer los comentarios de una tarea».
 * Aquí ninguna comprobación usa `GET /api/v1/tasks/:id/comments`: los comentarios se crean
 * solo por HTTP y se cuentan directamente en la tabla `comments` (columnas `task_id` y
 * `body`). Todo test que espera un fallo mira también que no haya filas nuevas, para que
 * no se ponga en verde solo porque la ruta no exista y devuelva 404.
 *
 * Los identificadores son los que devuelve la creación. Ningún test lee el reloj del
 * sistema: la lectura de una tarea suelta recibe `today` como constante.
 */
test.group('Comments | crear un comentario', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // La tarea suelta exige el día de quien mira; aquí no se prueba el vencimiento.
  const HOY = '2026-08-20'

  async function persona(client: any, email: string, fullName: string) {
    const user = await User.create({ fullName, email, password: 'secreto123' })
    const login = await client.post('/api/v1/auth/login').json({ email, password: 'secreto123' })

    return { user, token: login.body().data.token as string }
  }

  const con = (token: string) => ({ Authorization: `Bearer ${token}` })

  function tareaDe(
    user: User,
    datos: Partial<Pick<Task, 'title' | 'status' | 'dueDate'>> = {}
  ): Promise<Task> {
    return Task.create({
      title: 'Revisar el informe',
      status: 'pending',
      assigneeId: user.id,
      ...datos,
    })
  }

  const comentar = (client: any, token: string, tareaId: number, cuerpo: object) =>
    client.post(`/api/v1/tasks/${tareaId}/comments`).headers(con(token)).json(cuerpo)

  /** Filas de `comments`: todas, o solo las de una tarea. */
  async function contar(tareaId?: number): Promise<number> {
    const consulta = db.from('comments')
    if (tareaId !== undefined) consulta.where('task_id', tareaId)
    const [fila] = await consulta.count('* as total')
    return Number(fila.total)
  }

  /** Filas de una tarea con un texto exacto. */
  async function contarTexto(tareaId: number, body: string): Promise<number> {
    const [fila] = await db
      .from('comments')
      .where('task_id', tareaId)
      .where('body', body)
      .count('* as total')
    return Number(fila.total)
  }

  async function consultar(client: any, token: string, id: number) {
    const response = await client.get(`/api/v1/tasks/${id}`).headers(con(token)).qs({ today: HOY })
    response.assertStatus(200)
    return response.body().data
  }

  test('Alta con el texto como único dato | 201 con el comentario ya creado', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user)

    const response = await comentar(client, token, tarea.id, {
      body: 'Falta el informe del trimestre',
    })

    response.assertStatus(201)
    const dato = response.body().data
    assert.deepEqual(Object.keys(response.body()), ['data'])
    assert.deepEqual(Object.keys(dato).sort(), ['author', 'body', 'createdAt', 'id'])
    assert.isNotNull(dato.id)
    assert.equal(dato.body, 'Falta el informe del trimestre')
    assert.isString(dato.createdAt)
    assert.isFalse(Number.isNaN(Date.parse(dato.createdAt)))

    // El autor lleva exactamente id, nombre e iniciales: ni email ni nada más de la cuenta.
    assert.deepEqual(Object.keys(dato.author).sort(), ['fullName', 'id', 'initials'])
    assert.equal(dato.author.id, user.id)
    assert.equal(dato.author.fullName, 'Ada Lovelace')
    assert.equal(dato.author.initials, 'AL')
    assert.notInclude(JSON.stringify(response.body()), 'ada@example.com')

    // Se ha guardado una fila, en esa tarea y con ese texto.
    assert.equal(await contar(tarea.id), 1)
    assert.equal(await contarTexto(tarea.id, 'Falta el informe del trimestre'), 1)
  })

  test('El comentario nace a nombre de quien lo envía | author y authorId del cuerpo se ignoran', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const tarea = await tareaDe(ada.user)

    const response = await comentar(client, ada.token, tarea.id, {
      body: 'Lo reviso mañana',
      author: { id: grace.user.id, fullName: 'Grace Hopper', initials: 'GH' },
      authorId: grace.user.id,
      author_id: grace.user.id,
    })

    response.assertStatus(201)
    const dato = response.body().data
    assert.equal(dato.body, 'Lo reviso mañana')
    assert.equal(dato.author.id, ada.user.id)
    assert.notEqual(dato.author.id, grace.user.id)
    assert.equal(dato.author.fullName, 'Ada Lovelace')
    assert.equal(dato.author.initials, 'AL')
    assert.deepEqual(Object.keys(dato.author).sort(), ['fullName', 'id', 'initials'])
    assert.equal(await contar(tarea.id), 1)
  })

  test('Comentar no cambia la tarea | título, estado y responsable siguen igual', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const tarea = await tareaDe(ada.user, { title: 'Preparar la demo', status: 'in_progress' })

    const antes = await consultar(client, grace.token, tarea.id)

    const response = await comentar(client, grace.token, tarea.id, { body: 'Ya tengo el guion' })
    response.assertStatus(201)
    assert.equal(await contar(tarea.id), 1)

    const despues = await consultar(client, grace.token, tarea.id)
    assert.equal(despues.title, 'Preparar la demo')
    assert.equal(despues.title, antes.title)
    assert.equal(despues.status, 'in_progress')
    assert.equal(despues.status, antes.status)
    // Sigue siendo de Ada: comentar no reasigna ni la pasa a quien comenta.
    assert.equal(despues.assignee.id, ada.user.id)
    assert.deepEqual(despues.assignee, antes.assignee)
  })

  test('Una tarea que no existe no se comenta | 404 aunque el cuerpo sea inválido', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const real = await tareaDe(user)
    const inexistente = real.id + 100000

    // Cuerpo inválido sobre una tarea que no existe: manda el 404, no el 422.
    const invalido = await comentar(client, token, inexistente, { body: '' })
    // Y con un cuerpo correcto, el mismo 404.
    const valido = await comentar(client, token, inexistente, { body: 'Hola' })

    invalido.assertStatus(404)
    valido.assertStatus(404)
    assert.equal(await contar(), 0)
  })

  test('Sin sesión no se comenta | sin token y con un token inventado, 401', async ({
    client,
    assert,
  }) => {
    const { user } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user)

    const sinToken = await client
      .post(`/api/v1/tasks/${tarea.id}/comments`)
      .json({ body: 'Esto no debería entrar' })
    const inventado = await client
      .post(`/api/v1/tasks/${tarea.id}/comments`)
      .header('Authorization', 'Bearer oat_1.esto-no-es-un-token')
      .json({ body: 'Esto tampoco' })

    sinToken.assertStatus(401)
    inventado.assertStatus(401)
    assert.equal(await contar(), 0)
    assert.equal(await contar(tarea.id), 0)
  })

  test('Texto ausente, vacío o de solo espacios | 422 sobre body y nada se crea', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user)

    const cuerpos: object[] = [{}, { body: '' }, { body: '   ' }]

    for (const cuerpo of cuerpos) {
      const response = await comentar(client, token, tarea.id, cuerpo)

      response.assertStatus(422)
      response.assertBodyContains({ errors: [{ field: 'body' }] })
      assert.equal(await contar(), 0, `con el cuerpo ${JSON.stringify(cuerpo)}`)
    }
  })

  test('Texto demasiado largo | 501 caracteres dan 422 sobre body y nada se crea', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user)

    const response = await comentar(client, token, tarea.id, { body: 'a'.repeat(501) })

    response.assertStatus(422)
    response.assertBodyContains({ errors: [{ field: 'body' }] })
    // Superar el máximo es un error, nunca un recorte silencioso.
    assert.equal(await contar(), 0)
    assert.equal(await contar(tarea.id), 0)
  })

  test('Los espacios de los extremos no cuentan | se recortan y 500 caracteres caben', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user)

    const corto = await comentar(client, token, tarea.id, { body: '  Hecho  ' })

    corto.assertStatus(201)
    assert.equal(corto.body().data.body, 'Hecho')
    assert.equal(await contarTexto(tarea.id, 'Hecho'), 1)

    // 500 caracteres más espacios en los extremos: 504 en el cuerpo, 500 de texto.
    const exacto = 'a'.repeat(500)
    const largo = await comentar(client, token, tarea.id, { body: `  ${exacto}  ` })

    largo.assertStatus(201)
    assert.lengthOf(largo.body().data.body, 500)
    assert.equal(largo.body().data.body, exacto)
    assert.equal(await contarTexto(tarea.id, exacto), 1)
    assert.equal(await contar(tarea.id), 2)
  })

  test('El mismo texto dos veces seguidas | el segundo da 422 sobre body y queda uno solo', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user)

    const primero = await comentar(client, token, tarea.id, { body: 'Falta el informe' })
    primero.assertStatus(201)
    assert.equal(await contar(tarea.id), 1)

    const segundo = await comentar(client, token, tarea.id, { body: 'Falta el informe' })

    segundo.assertStatus(422)
    segundo.assertBodyContains({ errors: [{ field: 'body' }] })
    assert.equal(await contarTexto(tarea.id, 'Falta el informe'), 1)
    assert.equal(await contar(tarea.id), 1)

    // El duplicado se detecta una vez recortado el texto.
    const base = await comentar(client, token, tarea.id, { body: 'Hola' })
    base.assertStatus(201)
    assert.equal(await contar(tarea.id), 2)

    const conEspacios = await comentar(client, token, tarea.id, { body: '  Hola  ' })

    conEspacios.assertStatus(422)
    conEspacios.assertBodyContains({ errors: [{ field: 'body' }] })
    assert.equal(await contarTexto(tarea.id, 'Hola'), 1)
    assert.equal(await contar(tarea.id), 2)
  })

  test('Lo repetido pero no seguido sí se admite | A, B, A dan tres 201', async ({
    client,
    assert,
  }) => {
    const { user, token } = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const tarea = await tareaDe(user)

    const a1 = await comentar(client, token, tarea.id, { body: 'Texto A' })
    const b = await comentar(client, token, tarea.id, { body: 'Texto B' })
    const a2 = await comentar(client, token, tarea.id, { body: 'Texto A' })

    a1.assertStatus(201)
    b.assertStatus(201)
    a2.assertStatus(201)
    assert.equal(await contar(tarea.id), 3)
    assert.equal(await contarTexto(tarea.id, 'Texto A'), 2)
    // Son comentarios distintos, no el mismo devuelto otra vez.
    assert.notEqual(a1.body().data.id, a2.body().data.id)
  })

  test('Otra cuenta puede decir lo mismo | el mismo texto en la misma tarea da dos 201', async ({
    client,
    assert,
  }) => {
    const ada = await persona(client, 'ada@example.com', 'Ada Lovelace')
    const grace = await persona(client, 'grace@example.com', 'Grace Hopper')
    const tarea = await tareaDe(ada.user)

    const deAda = await comentar(client, ada.token, tarea.id, { body: 'Estoy de acuerdo' })
    const deGrace = await comentar(client, grace.token, tarea.id, { body: 'Estoy de acuerdo' })

    deAda.assertStatus(201)
    deGrace.assertStatus(201)
    assert.equal(deAda.body().data.author.id, ada.user.id)
    assert.equal(deGrace.body().data.author.id, grace.user.id)
    assert.equal(await contarTexto(tarea.id, 'Estoy de acuerdo'), 2)
    assert.equal(await contar(tarea.id), 2)
  })
})
