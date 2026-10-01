import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task'

/**
 * Validator to use when creating a task. Only the title is read:
 * status, assignee and any other field are dropped by VineJS.
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
})

/**
 * Validator to use when updating a task. Only the status can change.
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES),
})
