import { TaskSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export default class Task extends TaskSchema {
  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>
}
