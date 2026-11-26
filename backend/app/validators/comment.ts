import vine from '@vinejs/vine'

/**
 * El texto es lo único que un comentario necesita para existir, así que es lo único que
 * se lee. El autor no se acepta: lo pone el sistema desde el token, y un `author`,
 * `authorId` o `author_id` en el cuerpo se ignora sin error (VineJS descarta lo que el
 * esquema no declara).
 *
 * El orden importa: `trim()` corre antes que `minLength()`, de modo que un texto de solo
 * espacios se queda vacío y se rechaza igual que si no se hubiera escrito nada. El máximo
 * se comprueba sobre el texto ya recortado, y superarlo es un error, nunca un recorte.
 *
 * La regla de no repetir el mismo comentario seguido NO vive aquí: necesita mirar la base
 * de datos y es del servicio (`CommentService`), el único sitio que la conoce.
 */
export const createCommentValidator = vine.create({
  body: vine.string().trim().minLength(1).maxLength(500),
})
