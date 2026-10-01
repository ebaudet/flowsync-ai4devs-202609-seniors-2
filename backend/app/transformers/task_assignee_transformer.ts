import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

/**
 * Public view of a task's assignee: the name only, never the email,
 * the id or any other account data.
 */
export default class TaskAssigneeTransformer extends BaseTransformer<User> {
  toObject() {
    return this.pick(this.resource, ['fullName'])
  }
}
