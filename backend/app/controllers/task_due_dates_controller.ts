import Task from '#models/task'
import { setTaskDueDateValidator, toCalendarDay } from '#validators/task'
import type { HttpContext } from '@adonisjs/core/http'
import TaskDetailTransformer from '#transformers/task_detail_transformer'
import {
  ErrorResponse,
  NotFoundResponse,
  SetTaskDueDateBody,
  TaskDetailResponse,
} from '#openapi/schemas'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'

@ApiBearerAuth()
@ApiResponse({
  status: 401,
  description: 'Falta el token de acceso o no es válido. No se ejecuta nada.',
  type: ErrorResponse,
})
export default class TaskDueDatesController {
  /**
   * Fijar, cambiar y retirar la fecha de vencimiento son la misma operación, y
   * por eso comparten endpoint: quitar la fecha no es borrar un recurso, es
   * poner el valor «sin fecha», que es un valor legítimo del campo.
   *
   * Endpoint propio en vez de un update genérico de la tarea, por el mismo
   * motivo que el estado: por ahí se colarían el título y el responsable, que
   * este change no permite tocar.
   *
   * Cualquiera con sesión puede cambiar la fecha de cualquier tarea, igual que
   * el estado. No se comprueba quién es el responsable.
   */
  @ApiOperation({
    summary: 'Fijar, cambiar o retirar la fecha de vencimiento',
    description:
      'Con `dueDate: null` se retira la fecha, que es una operación admitida y no un error. Una fecha ya pasada se acepta. Cualquier cuenta con sesión puede hacerlo sobre cualquier tarea. La respuesta resuelve `isOverdue` contra `today`.',
  })
  @ApiBody({ type: SetTaskDueDateBody, required: true })
  @ApiResponse({
    status: 200,
    description: 'La tarea con la fecha ya actualizada.',
    type: TaskDetailResponse,
  })
  @ApiResponse({ status: 404, description: 'La tarea no existe.', type: NotFoundResponse })
  @ApiResponse({
    status: 422,
    description:
      '`dueDate` es una fecha imposible o mal formada, o falta `today`. La tarea conserva la fecha que tenía.',
    type: ErrorResponse,
  })
  async update({ params, request, serialize }: HttpContext) {
    const task = await Task.findOrFail(params.id)
    const { today, dueDate } = await request.validateUsing(setTaskDueDateValidator)

    // El `DateTime` del validador se queda aquí: hacia dentro, una fecha de
    // vencimiento es un día en texto y nunca un instante.
    task.dueDate = dueDate === null ? null : toCalendarDay(dueDate)
    await task.save()
    await task.load('assignee')

    // Se devuelve ya resuelta contra el día de quien pide, para que aplazar una
    // tarea vencida deje de mostrarla vencida en esta misma respuesta.
    return serialize(TaskDetailTransformer.transform(task, toCalendarDay(today)))
  }
}
