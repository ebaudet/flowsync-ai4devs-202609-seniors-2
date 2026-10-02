import vine from '@vinejs/vine'
import { TASK_STATUSES } from '#models/task'
import { isCalendarDay } from '#services/reference_day_service'

/**
 * A real calendar day written as `YYYY-MM-DD`. Past days are fine: logging
 * something that is already late is legitimate. Not `vine.date()`, which
 * returns a `Date` and brings a time zone back in.
 */
const calendarDay = vine.createRule((value, _options, field) => {
  if (typeof value === 'string' && !isCalendarDay(value)) {
    field.report(
      'The {{ field }} field must be a valid date in the YYYY-MM-DD format',
      'calendarDay',
      field
    )
  }
})

/**
 * Optional due day. `null` (or `""`, which the bodyparser turns into `null`)
 * means "no date"; leaving the key out means "do not touch it".
 */
const dueDate = () => vine.string().use(calendarDay()).nullable().optional()

/**
 * Validator to use when creating a task. Only the title and the optional
 * due day are read: status, assignee, isOverdue and any other field are
 * dropped by VineJS.
 */
export const createTaskValidator = vine.create({
  title: vine.string().trim().minLength(1).maxLength(255),
  dueDate: dueDate(),
})

/**
 * Validator to use when updating a task. Only the status and the due day can
 * change, and each one is optional (the controller asks for at least one).
 */
export const updateTaskValidator = vine.create({
  status: vine.enum(TASK_STATUSES).optional(),
  dueDate: dueDate(),
})
