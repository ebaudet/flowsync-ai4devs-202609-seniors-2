import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AlertCircleIcon, AlertTriangleIcon, Loader2Icon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import { TASK_STATUS_LABEL, type Task } from '@/lib/types'

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Algo ha ido mal. Inténtalo de nuevo.'

/**
 * Un `<input type="date">` emite fechas mientras se teclea el año (0002, 0020,
 * 0202…) y vacío cuando está a medias. Solo una fecha completa con año de
 * cuatro cifras se guarda sola; lo demás no genera ninguna petición.
 */
const isCompleteDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1000

/**
 * Tarea abierta: esqueleto mínimo del futuro detalle (PA-6). Solo permite
 * poner, cambiar y quitar la fecha, y enseña si está vencida según el backend.
 */
export function TaskPage() {
  const { token } = useAuth()
  const { id } = useParams()
  const taskId = Number(id)
  // `null` mientras carga. Si la carga falla no hay tarea que enseñar.
  const [task, setTask] = useState<Task | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [dateError, setDateError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // `ProtectedRoute` garantiza la sesión; sin token no hay nada que pedir.
    if (!token) return

    let cancelled = false

    api
      .getTask(token, taskId)
      .then((loaded) => {
        if (cancelled) return
        setTask(loaded)
        setDraft(loaded.dueDate ?? '')
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(errorMessage(error))
      })

    return () => {
      cancelled = true
    }
  }, [token, taskId])

  const saveDueDate = useCallback(
    async (dueDate: string | null) => {
      if (!token || !task || saving) return

      setSaving(true)
      setDateError(null)

      try {
        // La respuesta trae también `isOverdue`: la señal sale de ahí.
        const updated = await api.updateTaskDueDate(token, task.id, dueDate)
        setTask(updated)
        setDraft(updated.dueDate ?? '')
      } catch (error) {
        // Con error la tarea conserva la fecha que tuviera.
        setDraft(task.dueDate ?? '')
        setDateError(
          error instanceof ApiError
            ? (error.fieldErrors.dueDate ?? error.message)
            : errorMessage(error),
        )
      } finally {
        setSaving(false)
      }
    },
    [token, task, saving],
  )

  const handleDateChange = (value: string) => {
    setDraft(value)
    if (isCompleteDay(value) && value !== task?.dueDate) void saveDueDate(value)
  }

  return (
    <div className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Tarea</h1>
          <Link
            to="/tasks"
            className="text-foreground text-sm font-medium underline"
          >
            Volver a la lista
          </Link>
        </header>

        {loadError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : task === null ? (
          <div
            className="flex justify-center py-12"
            role="status"
            aria-live="polite"
          >
            <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
            <span className="sr-only">Cargando tarea…</span>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="break-words">{task.title}</CardTitle>
              <CardDescription>
                {task.assignee.fullName?.trim() || 'Sin nombre'} ·{' '}
                {TASK_STATUS_LABEL[task.status]}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div role="status">
                {task.isOverdue && (
                  <p className="text-destructive flex items-center gap-2 text-sm font-medium">
                    <AlertTriangleIcon className="size-4" aria-hidden="true" />
                    Vencida
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dueDate">Fecha de vencimiento</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="dueDate"
                    name="dueDate"
                    type="date"
                    max="9999-12-31"
                    className="w-auto"
                    value={draft}
                    disabled={saving}
                    aria-invalid={dateError ? true : undefined}
                    aria-describedby={dateError ? 'dueDate-error' : undefined}
                    onChange={(event) => handleDateChange(event.target.value)}
                    // Un campo dejado a medias no quita la fecha: vuelve a la guardada.
                    onBlur={() => setDraft(task.dueDate ?? '')}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || !task.dueDate}
                    onClick={() => void saveDueDate(null)}
                  >
                    Quitar fecha
                  </Button>
                </div>
                <FieldError
                  id="dueDate-error"
                  message={dateError ?? undefined}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
