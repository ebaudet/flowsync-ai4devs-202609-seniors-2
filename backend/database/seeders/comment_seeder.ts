import db from '@adonisjs/lucid/services/db'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Task from '#models/task'
import User from '#models/user'
import { CommentFactory, TEXTOS_COMENTARIO } from '#database/factories/comment_factory'
import { TaskFactory } from '#database/factories/task_factory'
import { UserFactory, emailPara } from '#database/factories/user_factory'

/**
 * Tres cuentas de desarrollo. Son las tres primeras del equipo que siembra `main_seeder`
 * (mismo nombre, y por tanto mismo correo con `emailPara`): si ya existen se reutilizan y
 * si no, este seeder las crea con la misma contraseña (`PASSWORD_DEMO`). Los dos seeders
 * no dependen el uno del otro ni del orden en que se lancen.
 */
const EQUIPO = ['Lucía Fernández', 'Mateo Ortega', 'Valentina Navarro']

/** Cuántas tareas llevan hilo, y cuántos comentarios tiene cada uno (de 2 a 5). */
const TAREAS_CON_HILO = 8
const COMENTARIOS_POR_HILO = [3, 2, 5, 4, 3, 2, 4, 3]

export default class extends BaseSeeder {
  /**
   * Solo en desarrollo: las cuentas llevan una contraseña pública.
   */
  static environment = ['development']

  /**
   * Se puede lanzar las veces que haga falta y sobre una base vacía.
   *
   * - Cuentas: las del equipo se buscan por correo y solo se crean las que faltan.
   * - Tareas: se reutilizan las primeras vivas que haya y solo se crean (con
   *   `TaskFactory`) las que falten hasta `TAREAS_CON_HILO`, a nombre del equipo.
   * - Comentarios: solo se siembra una tarea que aún no tiene ninguno, de modo que una
   *   segunda ejecución no añade nada, ni a las tareas ya sembradas ni a ninguna que
   *   tuviera comentarios por otra vía.
   *
   * El texto de cada comentario sale de una mezcla sin reposición dentro de su hilo, así
   * que nunca se repite en el mismo hilo y, en particular, ninguna cuenta repite seguido
   * su texto en una tarea (la regla del spec). Las fechas van en orden creciente entre la
   * creación de la tarea y ahora, así que ninguna cae en el futuro ni antes de la tarea.
   * Todo en una transacción: o se siembra entero o no queda nada a medias.
   */
  async run() {
    await db.transaction(async (trx) => {
      const equipo: User[] = []
      for (const fullName of EQUIPO) {
        const email = emailPara(fullName)
        const existente = await User.query({ client: trx }).where('email', email).first()
        equipo.push(
          existente ?? (await UserFactory.client(trx).merge({ fullName, email }).create())
        )
      }

      const tareas = await Task.query({ client: trx }).orderBy('id', 'asc').limit(TAREAS_CON_HILO)
      for (let i = tareas.length; i < TAREAS_CON_HILO; i++) {
        tareas.push(
          await TaskFactory.client(trx)
            .merge({ assigneeId: equipo[i % equipo.length].id })
            .create()
        )
      }

      const ahora = DateTime.now()
      let semilla = 0

      for (const [indice, tarea] of tareas.entries()) {
        const [{ total }] = await trx
          .from('comments')
          .where('task_id', tarea.id)
          .count('* as total')
        if (Number(total) > 0) continue

        const cantidad = COMENTARIOS_POR_HILO[indice % COMENTARIOS_POR_HILO.length]
        // Reparto determinista: cada hilo arranca en un punto distinto de la lista.
        const textos = Array.from(
          { length: cantidad },
          (_, k) => TEXTOS_COMENTARIO[(semilla + k * 5) % TEXTOS_COMENTARIO.length]
        )
        semilla += 7

        const desde = tarea.createdAt
        const tramo = ahora.diff(desde).as('milliseconds') / (cantidad + 1)

        for (const [k, body] of textos.entries()) {
          const createdAt = desde.plus({ milliseconds: Math.floor(tramo * (k + 1)) })

          // Las cuentas se alternan: en un hilo de varias personas, lo habitual es que
          // nadie conteste dos veces seguidas.
          await CommentFactory.client(trx)
            .merge({
              taskId: tarea.id,
              authorId: equipo[(indice + k) % equipo.length].id,
              body,
              createdAt,
              updatedAt: createdAt,
            })
            .create()
        }
      }
    })
  }
}
