import { useCallback, useEffect, useRef, useState } from 'react'
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

/** Espera tras el último cambio antes de guardar: teclear una fecha la completa varias veces. */
const SAVE_DELAY_MS = 600

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
  // Fecha que el servidor tiene guardada ahora mismo.
  const savedRef = useRef<string | null>(null)

  useEffect(() => {
    // `ProtectedRoute` garantiza la sesión; sin token no hay nada que pedir.
    if (!token) return

    let cancelled = false

    api
      .getTask(token, taskId)
      .then((loaded) => {
        if (cancelled) return
        savedRef.current = loaded.dueDate
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

  // Fecha completa a la espera de guardarse, su temporizador y el número del
  // último guardado: una respuesta de un guardado anterior no pisa a la última.
  const pendingRef = useRef<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const seqRef = useRef(0)

  const saveDueDate = useCallback(
    async (dueDate: string | null) => {
      if (!token) return

      const seq = ++seqRef.current
      setSaving(true)
      setDateError(null)

      try {
        // La respuesta trae también `isOverdue`: la señal sale de ahí.
        const updated = await api.updateTaskDueDate(token, taskId, dueDate)
        if (seq !== seqRef.current) return
        savedRef.current = updated.dueDate
        setTask(updated)
        setDraft(updated.dueDate ?? '')
      } catch (error) {
        if (seq !== seqRef.current) return
        // Con error la tarea conserva la fecha que tuviera.
        setDraft(savedRef.current ?? '')
        setDateError(
          error instanceof ApiError
            ? (error.fieldErrors.dueDate ?? error.message)
            : errorMessage(error),
        )
      } finally {
        if (seq === seqRef.current) setSaving(false)
      }
    },
    [token, taskId],
  )

  const flushPending = useCallback(() => {
    clearTimeout(timerRef.current)
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending !== null) void saveDueDate(pending)
  }, [saveDueDate])

  // Cerrar la tarea con un cambio sin enviar todavía no lo pierde.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current)
      if (token && pendingRef.current !== null) {
        void api
          .updateTaskDueDate(token, taskId, pendingRef.current)
          .catch(() => undefined)
      }
    },
    [token, taskId],
  )

  const handleDateChange = (value: string) => {
    setDraft(value)
    clearTimeout(timerRef.current)
    pendingRef.current = null

    if (isCompleteDay(value) && value !== savedRef.current) {
      pendingRef.current = value
      timerRef.current = setTimeout(flushPending, SAVE_DELAY_MS)
    }
  }

  const handleDateBlur = () => {
    if (pendingRef.current !== null) {
      flushPending()
    } else if (!saving) {
      // Un campo dejado a medias no quita la fecha: vuelve a la guardada.
      setDraft(savedRef.current ?? '')
    }
  }

  const handleRemove = () => {
    clearTimeout(timerRef.current)
    pendingRef.current = null
    void saveDueDate(null)
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
                    aria-invalid={dateError ? true : undefined}
                    aria-describedby={dateError ? 'dueDate-error' : undefined}
                    onChange={(event) => handleDateChange(event.target.value)}
                    onBlur={handleDateBlur}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || !task.dueDate}
                    onClick={handleRemove}
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
