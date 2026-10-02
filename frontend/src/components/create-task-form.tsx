import { useState } from 'react'
import { AlertCircleIcon } from 'lucide-react'
import { useAuthForm } from '@/auth/use-auth-form'
import { FieldError } from '@/components/field-error'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const FIELDS = ['title'] as const

type CreateTaskFormProps = {
  /** Crea la tarea; si rechaza con un `ApiError`, el formulario enseña el motivo. */
  onCreate: (title: string) => Promise<void>
}

/**
 * Un único campo: el título. El responsable y el estado los pone el servidor.
 * Sin `maxLength` en el input: bloquear la escritura sería un recorte
 * silencioso; el límite lo avisa el 422 del backend.
 */
export function CreateTaskForm({ onCreate }: CreateTaskFormProps) {
  const { isSubmitting, formError, fieldErrors, submit, failWith } =
    useAuthForm(FIELDS)
  const [title, setTitle] = useState('')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const trimmed = title.trim()
    if (!trimmed) {
      failWith('title', 'Falta rellenar el título.')
      return
    }

    return submit(async () => {
      await onCreate(trimmed)
      // Solo se vacía si la tarea se ha creado: con error se conserva el texto.
      setTitle('')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
      {formError && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          name="title"
          autoComplete="off"
          placeholder="Revisar el despliegue"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'title-error' : undefined}
        />
        <FieldError id="title-error" message={fieldErrors.title} />
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creando…' : 'Crear tarea'}
      </Button>
    </form>
  )
}
