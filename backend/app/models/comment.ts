import Task from '#models/task'
import User from '#models/user'
import { belongsTo } from '@adonisjs/lucid/orm'
import { CommentSchema } from '#database/schema'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Un comentario de una tarea. Solo relaciones: las columnas vienen del esquema generado.
 *
 * `task` pasa por el modelo `Task`, así que una tarea en la papelera no se resuelve desde
 * aquí aunque su fila exista: sus comentarios se conservan en la tabla, pero para todo lo
 * que pasa por `Task` esa tarea (y por tanto su hilo) no existe hasta que se restaure.
 */
export default class Comment extends CommentSchema {
  @belongsTo(() => Task, { foreignKey: 'taskId' })
  declare task: BelongsTo<typeof Task>

  @belongsTo(() => User, { foreignKey: 'authorId' })
  declare author: BelongsTo<typeof User>
}
