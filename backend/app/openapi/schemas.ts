import { TASK_STATUSES } from '#models/task'
import { ApiProperty, ApiPropertyOptional } from '@foadonis/openapi/decorators'

/**
 * Esquemas que el documento OpenAPI describe una sola vez en
 * `components.schemas` y que cada respuesta o cuerpo referencia con `$ref`.
 *
 * Son solo descripción: ningún controlador, transformer ni validador los usa
 * para decidir nada. Lo que el documento promete aquí es lo que el requisito
 * correspondiente de `openspec/specs/tasks/spec.md` exige; en particular, el
 * responsable de una tarea se describe con nombre e iniciales y sin email.
 *
 * El orden importa: una clase tiene que declararse antes de la que la usa.
 */

const CALENDAR_DAY = { type: 'string', format: 'date', example: '2026-09-30' } as const

/**
 * El responsable de una tarea: lo justo para identificarlo, sin email.
 *
 * Es lo que exige el requisito «Lo que cada tarea muestra de su responsable».
 * Los esquemas no cierran las propiedades (`additionalProperties`), porque
 * hasta que se integre la corrección de `TaskTransformer` el `assignee` de la
 * lista, de la creación y del cambio de estado trae además `email`,
 * `createdAt` y `updatedAt` de la cuenta. Esos campos NO son parte del
 * contrato y ningún cliente debe leerlos.
 */
export class TaskAssignee {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', nullable: true, example: 'Ada Lovelace' })
  declare fullName: string | null

  @ApiProperty({ type: 'string', example: 'AL' })
  declare initials: string
}

/** Una tarea sin vencimiento: la forma de la lista, de la creación y del cambio de estado. */
export class Task {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', example: 'Revisar el informe' })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({ type: TaskAssignee })
  declare assignee: TaskAssignee

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  declare updatedAt: string | null
}

/**
 * Una tarea suelta: lo mismo que `Task` y, además, su fecha de vencimiento y su
 * condición de vencida. Es la única forma que lleva el vencimiento.
 */
export class TaskDetail {
  @ApiProperty({ type: 'integer' })
  declare id: number

  @ApiProperty({ type: 'string', example: 'Revisar el informe' })
  declare title: string

  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string

  @ApiProperty({ type: TaskAssignee })
  declare assignee: TaskAssignee

  @ApiProperty({ type: 'string', format: 'date', nullable: true, example: '2026-09-30' })
  declare dueDate: string | null

  @ApiProperty({
    type: 'boolean',
    description:
      'Calculada al consultar contra el día `today` de quien mira: hay fecha, es anterior a `today` y la tarea no está hecha.',
  })
  declare isOverdue: boolean

  @ApiProperty({ type: 'string', format: 'date-time' })
  declare createdAt: string

  @ApiProperty({ type: 'string', format: 'date-time', nullable: true })
  declare updatedAt: string | null
}

/** Toda respuesta de éxito va envuelta en `{ data }`. */
export class TaskResponse {
  @ApiProperty({ type: Task })
  declare data: Task
}

export class TaskListResponse {
  @ApiProperty({ type: [Task], description: 'Entera, sin paginar. Vacía si no hay ninguna.' })
  declare data: Task[]
}

export class TaskDetailResponse {
  @ApiProperty({ type: TaskDetail })
  declare data: TaskDetail
}

/** Cuerpo de `POST /tasks`: el título es lo único que se admite. */
export class CreateTaskBody {
  @ApiProperty({
    type: 'string',
    minLength: 1,
    maxLength: 200,
    description: 'Sin espacios en los extremos. Vacío o de solo espacios se rechaza.',
    example: 'Revisar el informe',
  })
  declare title: string
}

/** Cuerpo de `PATCH /tasks/{id}/status`. */
export class UpdateTaskStatusBody {
  @ApiProperty({ enum: [...TASK_STATUSES] })
  declare status: string
}

/** Cuerpo de `PUT /tasks/{id}/due-date`. */
export class SetTaskDueDateBody {
  @ApiProperty({
    ...CALENDAR_DAY,
    nullable: true,
    description: 'Un día del calendario, sin hora. `null` retira la fecha.',
  })
  declare dueDate: string | null

  @ApiProperty({
    ...CALENDAR_DAY,
    description:
      'El día de quien pide, contra el que se resuelve `isOverdue` en la respuesta. Obligatorio.',
  })
  declare today: string
}

/** Un error de validación o de autenticación. */
export class ErrorItem {
  @ApiProperty({ type: 'string' })
  declare message: string

  @ApiPropertyOptional({ type: 'string', example: 'required' })
  declare rule: string

  @ApiPropertyOptional({ type: 'string', example: 'title' })
  declare field: string

  @ApiPropertyOptional({
    schema: { type: 'object', additionalProperties: true },
    description: 'Datos de la regla incumplida, por ejemplo `{ "choices": [...] }` en un enum.',
  })
  declare meta: Record<string, unknown>
}

/** Formato de los errores `422` y `401`: `{ errors: [...] }`. */
export class ErrorResponse {
  @ApiProperty({ type: [ErrorItem] })
  declare errors: ErrorItem[]
}

/**
 * Formato del `404` de una tarea que no existe. Fuera de depuración el cuerpo es
 * solo `{ "message": "Row not found" }`: `code` llega únicamente en desarrollo.
 */
export class NotFoundResponse {
  @ApiProperty({ type: 'string', example: 'Row not found' })
  declare message: string

  @ApiPropertyOptional({
    type: 'string',
    example: 'E_ROW_NOT_FOUND',
    description: 'Solo en modo depuración.',
  })
  declare code: string
}
