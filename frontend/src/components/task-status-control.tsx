import { Button } from '@/components/ui/button'
import { TASK_STATUS_LABEL, type TaskStatus } from '@/lib/types'

const STATUSES = Object.keys(TASK_STATUS_LABEL) as TaskStatus[]

type TaskStatusControlProps = {
  status: TaskStatus
  disabled?: boolean
  onChange: (status: TaskStatus) => void
}

/** Un clic por destino, sin diálogo: el estado actual va destacado. */
export function TaskStatusControl({
  status,
  disabled,
  onChange,
}: TaskStatusControlProps) {
  return (
    <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
      {STATUSES.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={option === status ? 'default' : 'outline'}
          aria-pressed={option === status}
          disabled={disabled}
          onClick={() => onChange(option)}
        >
          {TASK_STATUS_LABEL[option]}
        </Button>
      ))}
    </div>
  )
}
