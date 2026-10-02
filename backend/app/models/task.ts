import { TaskSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const

export default class Task extends TaskSchema {
  @belongsTo(() => User, { foreignKey: 'assigneeId' })
  declare assignee: BelongsTo<typeof User>

  /**
   * The single definition of "overdue": it has a due day, that day is before
   * `today` (a `YYYY-MM-DD` day, so due today is not overdue yet) and it is
   * not done. Never stored: it is evaluated on every read.
   */
  isOverdueOn(today: string): boolean {
    return this.dueDate !== null && this.dueDate < today && this.status !== 'done'
  }
}
