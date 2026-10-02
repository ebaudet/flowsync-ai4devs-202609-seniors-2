import Task from '#models/task'
import type { HttpContext } from '@adonisjs/core/http'
import { errors } from '@vinejs/vine'
import TaskTransformer, { withReferenceDay } from '#transformers/task_transformer'
import { resolveReferenceDay } from '#services/reference_day_service'
import { createTaskValidator, updateTaskValidator } from '#validators/task'

export default class TasksController {
  async index({ request, serialize }: HttpContext) {
    const day = resolveReferenceDay(request)
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(withReferenceDay(tasks, day)))
  }

  async show({ params, request, serialize }: HttpContext) {
    const day = resolveReferenceDay(request)
    const task = await Task.findOrFail(params.id)
    await task.load('assignee')

    return serialize(TaskTransformer.transform(withReferenceDay(task, day)))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const day = resolveReferenceDay(request)
    const { title, dueDate } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({
      title,
      dueDate: dueDate ?? null,
      assigneeId: auth.getUserOrFail().id,
    })
    await task.refresh()
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(withReferenceDay(task, day)))
  }

  async update({ params, request, serialize }: HttpContext) {
    const day = resolveReferenceDay(request)
    const task = await Task.findOrFail(params.id)
    const { status, dueDate } = await request.validateUsing(updateTaskValidator)

    // `undefined` = not sent (leave it); `null` = sent empty (clear the date).
    if (status === undefined && dueDate === undefined) {
      throw new errors.E_VALIDATION_ERROR([
        {
          message: 'The status field must be defined',
          rule: 'required',
          field: 'status',
        },
      ])
    }

    if (status !== undefined) task.status = status
    if (dueDate !== undefined) task.dueDate = dueDate
    await task.save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(withReferenceDay(task, day)))
  }
}
