import Task from '#models/task'
import CommentService from '#services/comment_service'
import CommentTransformer from '#transformers/comment_transformer'
import { createCommentValidator } from '#validators/comment'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse } from '@foadonis/openapi/decorators'
import {
  CommentResponse,
  CreateCommentBody,
  ErrorResponse,
  ValidationErrorResponse,
} from '#openapi/schemas'

@ApiBearerAuth()
export default class CommentsController {
  /**
   * Comentar una tarea. El orden de las comprobaciones es parte del contrato: sin token
   * el middleware ya ha respondido 401; después se resuelve la tarea (404) ANTES de mirar
   * el cuerpo, como hacen los demás endpoints de `/tasks/:id`; después se valida el cuerpo
   * (422) y por último el servicio aplica la regla de no repetición (422).
   *
   * El autor sale siempre del token. Una tarea en la papelera no existe para `Task`, así
   * que tampoco se puede comentar.
   */
  @ApiOperation({
    summary: 'Comentar una tarea',
    description:
      'Crea un comentario a nombre de la cuenta dueña del token y lo devuelve. El texto es el único dato que se lee: un `author`, `authorId` o `author_id` en el cuerpo se ignora. Se recortan los espacios de los extremos y el texto resultante tiene de 1 a 500 caracteres. Se rechaza con 422 un texto idéntico al último comentario de esa misma cuenta en esa misma tarea. Comentar no cambia ningún dato de la tarea. Se comprueba que la tarea existe antes que el cuerpo.',
  })
  @ApiBody({ type: () => CreateCommentBody })
  @ApiResponse({
    status: 201,
    description: 'El comentario ya creado, con su autor reducido a `id`, `fullName` e `initials`.',
    type: () => CommentResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Falta el token o no es válido. No se crea ningún comentario.',
    type: () => ErrorResponse,
  })
  @ApiResponse({
    status: 404,
    description:
      'No existe ninguna tarea con ese identificador (o está en la papelera). Se comprueba antes que el cuerpo: con un cuerpo inválido sigue siendo 404.',
    type: () => ErrorResponse,
  })
  @ApiResponse({
    status: 422,
    description:
      'El texto falta, está vacío, es solo espacios, pasa de 500 caracteres, o repite el último comentario de esta cuenta en esta tarea. El error apunta al campo `body` y no se crea nada ni se guarda una versión recortada.',
    type: () => ValidationErrorResponse,
  })
  @inject()
  async store(
    { params, request, response, auth, serialize }: HttpContext,
    commentService: CommentService
  ) {
    const task = await Task.findOrFail(params.id)
    const { body } = await request.validateUsing(createCommentValidator)
    const author = auth.getUserOrFail()

    const comment = await commentService.create(task, author, body)
    await comment.load('author')

    // El estado se marca aparte y el cuerpo se devuelve: `serialize()` entrega una
    // promesa que resuelve el pipeline al devolverla, y pasársela a `response.created()`
    // deja la respuesta con el cuerpo vacío.
    response.status(201)
    return serialize(CommentTransformer.transform(comment))
  }
}
