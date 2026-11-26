import type Comment from '#models/comment'
import { BaseTransformer } from '@adonisjs/core/transformers'
import TaskAssigneeTransformer from '#transformers/task_assignee_transformer'

export default class CommentTransformer extends BaseTransformer<Comment> {
  toObject() {
    return {
      ...this.pick(this.resource, ['id', 'body', 'createdAt']),
      // El autor va por `TaskAssigneeTransformer`, que ya produce exactamente
      // `{ id, fullName, initials }`: la misma forma mínima de una persona junto a una
      // tarea. Nunca por `UserTransformer`, que incluye el email y las fechas de la cuenta.
      author: TaskAssigneeTransformer.transform(this.whenLoaded(this.resource.author)),
    }
  }
}
