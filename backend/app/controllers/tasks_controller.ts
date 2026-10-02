import Task from '#models/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskTransformer from '#transformers/task_transformer'
import { createTaskValidator, updateTaskValidator } from '#validators/task'

export default class TasksController {
  async index({ serialize }: HttpContext) {
    const tasks = await Task.query().preload('assignee')

    return serialize(TaskTransformer.transform(tasks))
  }

  async store({ auth, request, response, serialize }: HttpContext) {
    const { title } = await request.validateUsing(createTaskValidator)

    const task = await Task.create({ title, assigneeId: auth.getUserOrFail().id })
    await task.refresh()
    await task.load('assignee')

    response.status(201)
    return serialize(TaskTransformer.transform(task))
  }

  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { status } = await request.validateUsing(updateTaskValidator)

    await task.merge({ status }).save()
    await task.load('assignee')

    return serialize(TaskTransformer.transform(task))
  }
}
