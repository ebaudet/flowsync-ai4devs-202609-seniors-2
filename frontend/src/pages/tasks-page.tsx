import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'
import { useAuth } from '@/auth/use-auth'
import { CreateTaskForm } from '@/components/create-task-form'
import { TaskRow } from '@/components/task-row'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import * as api from '@/lib/api'
import { ApiError } from '@/lib/api'
import type { Task, TaskStatus } from '@/lib/types'

const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Algo ha ido mal. Inténtalo de nuevo.'

export function TasksPage() {
  const { token } = useAuth()
  // `null` mientras carga. Si la carga falla no hay lista: no se sabe qué hay.
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  // Filas con un cambio de estado en vuelo: su control queda bloqueado.
  const [busyIds, setBusyIds] = useState<ReadonlySet<number>>(new Set())

  useEffect(() => {
    // `ProtectedRoute` garantiza la sesión; sin token no hay nada que pedir.
    if (!token) return

    let cancelled = false

    api
      .listTasks(token)
      .then((list) => {
        if (!cancelled) setTasks(list)
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(errorMessage(error))
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleCreate = useCallback(
    async (title: string) => {
      if (!token) return

      const created = await api.createTask(token, title)
      // Se añade la respuesta tal cual, sin volver a pedir la lista.
      setTasks((current) => [...(current ?? []), created])
      setActionError(null)
    },
    [token],
  )

  const handleStatusChange = useCallback(
    async (task: Task, status: TaskStatus) => {
      if (!token || busyIds.has(task.id) || task.status === status) return

      const previous = task.status
      const setStatus = (next: TaskStatus) =>
        setTasks(
          (current) =>
            current?.map((item) =>
              item.id === task.id ? { ...item, status: next } : item,
            ) ?? null,
        )
      const setBusy = (busy: boolean) =>
        setBusyIds((current) => {
          const next = new Set(current)
          if (busy) next.add(task.id)
          else next.delete(task.id)
          return next
        })

      // Optimista: la fila cambia ya y vuelve atrás si el servidor falla.
      setActionError(null)
      setStatus(status)
      setBusy(true)

      try {
        await api.updateTaskStatus(token, task.id, status)
      } catch (error) {
        setStatus(previous)
        setActionError(errorMessage(error))
      } finally {
        setBusy(false)
      }
    },
    [token, busyIds],
  )

  return (
    <div className="bg-muted/40 min-h-svh p-6">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Tareas</h1>
          <Link
            to="/profile"
            className="text-foreground text-sm font-medium underline"
          >
            Mi perfil
          </Link>
        </header>

        {loadError ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : tasks === null ? (
          <div
            className="flex justify-center py-12"
            role="status"
            aria-live="polite"
          >
            <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
            <span className="sr-only">Cargando tareas…</span>
          </div>
        ) : (
          <div className="grid gap-6">
            {actionError && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Nueva tarea</CardTitle>
                <CardDescription>
                  Se crea pendiente y a tu nombre.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CreateTaskForm onCreate={handleCreate} />
              </CardContent>
            </Card>

            <Card>
              {tasks.length === 0 ? (
                <CardHeader>
                  <CardTitle>Aún no hay tareas</CardTitle>
                  <CardDescription>
                    Aquí aparecerán las tareas del equipo, con quién está en
                    cada una y en qué estado. Crea la primera con el formulario
                    de arriba.
                  </CardDescription>
                </CardHeader>
              ) : (
                <CardContent>
                  <ul className="divide-y">
                    {tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        disabled={busyIds.has(task.id)}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
