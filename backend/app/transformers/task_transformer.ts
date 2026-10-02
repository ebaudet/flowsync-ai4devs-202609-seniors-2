import type Task from '#models/task'
import { BaseTransformer } from '@adonisjs/core/transformers'
import TaskAssigneeTransformer from '#transformers/task_assignee_transformer'

const REFERENCE_DAY_KEY = 'referenceDay'

/**
 * Leaves the day of the person reading on the task(s), because a transformer
 * only receives its resource and cannot see the request. Call it before
 * transforming; `isOverdue` is evaluated with that day.
 */
export function withReferenceDay<T extends Task | Task[]>(tasks: T, day: string): T {
  for (const task of Array.isArray(tasks) ? tasks : [tasks]) {
    task.$extras[REFERENCE_DAY_KEY] = day
  }

  return tasks
}

export default class TaskTransformer extends BaseTransformer<Task> {
  toObject() {
    const day = this.resource.$extras[REFERENCE_DAY_KEY]

    if (typeof day !== 'string') {
      // A verdict with a guessed day would be silently wrong: fail loudly instead.
      throw new Error('Task transformed without a reference day: use withReferenceDay()')
    }

    return {
      ...this.pick(this.resource, ['id', 'title', 'status', 'dueDate']),
      isOverdue: this.resource.isOverdueOn(day),
      assignee: TaskAssigneeTransformer.transform(this.whenLoaded(this.resource.assignee)),
    }
  }
}
