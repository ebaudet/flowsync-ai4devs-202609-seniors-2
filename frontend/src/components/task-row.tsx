import { Link } from 'react-router'
import { TaskStatusControl } from '@/components/task-status-control'
import { TASK_STATUS_LABEL, type Task, type TaskStatus } from '@/lib/types'

type TaskRowProps = {
  task: Task
  /** Bloquea el control mientras hay un cambio de estado de esta fila en vuelo. */
  disabled?: boolean
  onStatusChange: (task: Task, status: TaskStatus) => void
}

export function TaskRow({ task, disabled, onStatusChange }: TaskRowProps) {
  // El backend no recorta `fullName`: un nombre en blanco se pinta como ausente.
  const assignee = task.assignee.fullName?.trim() || 'Sin nombre'

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium break-words">
          <Link to={`/tasks/${task.id}`} className="hover:underline">
            {task.title}
          </Link>
        </p>
        <p className="text-muted-foreground text-sm">
          {assignee} · {TASK_STATUS_LABEL[task.status]}
        </p>
      </div>
      <TaskStatusControl
        status={task.status}
        disabled={disabled}
        onChange={(status) => onStatusChange(task, status)}
      />
    </li>
  )
}
