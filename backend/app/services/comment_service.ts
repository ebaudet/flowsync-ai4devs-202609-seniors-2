import Comment from '#models/comment'
import type Task from '#models/task'
import type User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { errors } from '@vinejs/vine'

/**
 * La lógica de crear un comentario, y el único sitio donde vive la regla «un mismo
 * comentario no se repite seguido» (spec `comments`).
 */
export default class CommentService {
  /**
   * Crea el comentario de `author` sobre `task`. `body` llega ya validado y recortado.
   *
   * Si el texto es idéntico al último comentario de ESA cuenta en ESA tarea (el de `id`
   * más alto) se rechaza con el mismo error que produce VineJS —`E_VALIDATION_ERROR` con
   * `{ message, rule, field }` sobre `body`—, de modo que el cliente recibe el mismo 422
   * `{ errors: [...] }` que por cualquier otra validación y no hay un formato aparte. La
   * rechazada no crea nada.
   *
   * Comprobar y escribir van en una transacción con un cerrojo por (tarea, cuenta): sin
   * él, un doble clic que lance dos peticiones a la vez vería las dos el mismo «último
   * comentario» y las dos se guardarían, que es justo el accidente que la regla evita.
   * El cerrojo es `pg_advisory_xact_lock`, se suelta solo al terminar la transacción y
   * solo hace esperar a peticiones de la misma cuenta sobre la misma tarea.
   */
  async create(task: Task, author: User, body: string): Promise<Comment> {
    return db.transaction(async (trx) => {
      await trx.rawQuery('select pg_advisory_xact_lock(?, ?)', [task.id, author.id])

      const last = await Comment.query({ client: trx })
        .where('taskId', task.id)
        .where('authorId', author.id)
        .orderBy('id', 'desc')
        .first()

      if (last && last.body === body) {
        throw new errors.E_VALIDATION_ERROR([
          {
            message: 'The body field must not repeat your previous comment on this task',
            rule: 'notRepeated',
            field: 'body',
          },
        ])
      }

      return Comment.create({ taskId: task.id, authorId: author.id, body }, { client: trx })
    })
  }
}
