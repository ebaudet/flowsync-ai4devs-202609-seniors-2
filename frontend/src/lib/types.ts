/**
 * Espejo de `UserTransformer` del backend (app/transformers/user_transformer.ts).
 */
export type User = {
  id: number
  fullName: string | null
  email: string
  initials: string
  createdAt: string
  updatedAt: string
}

/**
 * Respuesta de `POST /auth/signup` y `POST /auth/login`, ya sin el envoltorio `{ data }`.
 */
export type AuthResult = {
  user: User
  token: string
}

export type SignupPayload = {
  /** El backend lo declara `.nullable()`: la clave debe viajar siempre, aunque valga `null`. */
  fullName: string | null
  email: string
  password: string
  passwordConfirmation: string
}

export type LoginPayload = {
  email: string
  password: string
}

/**
 * Estados de una tarea. Son los identificadores de la API; el castellano que
 * ve la persona sale solo de `TASK_STATUS_LABEL`.
 */
export type TaskStatus = 'pending' | 'in_progress' | 'done'

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  in_progress: 'En curso',
  done: 'Hecho',
}

/**
 * Espejo de `TaskTransformer` del backend (app/transformers/task_transformer.ts).
 * `dueDate` es un día de calendario `YYYY-MM-DD` (o `null`) y `isOverdue` lo
 * decide el backend con el día de quien mira: el cliente nunca lo calcula.
 * Sin datos de cuenta del responsable: la API no los expone.
 */
export type Task = {
  id: number
  title: string
  status: TaskStatus
  dueDate: string | null
  isOverdue: boolean
  assignee: { fullName: string | null }
}
