import factory from '@adonisjs/lucid/factories'
import { DateTime } from 'luxon'
import Comment from '#models/comment'
import { TaskFactory } from '#database/factories/task_factory'
import { UserFactory } from '#database/factories/user_factory'
import type { FactoryContextContract } from '@adonisjs/lucid/types/factory'

type Faker = FactoryContextContract['faker']

/**
 * Comentarios inventados, escritos como los escribiría un equipo de producto: una o dos
 * frases en castellano con tildes, sin espacios sobrantes y muy por debajo de los 500
 * caracteres. Son todos distintos entre sí: el seeder saca varios para un mismo hilo y
 * así la regla de no repetir el mismo texto seguido se cumple por construcción.
 */
export const TEXTOS_COMENTARIO = [
  'Falta el informe del trimestre, lo reviso mañana a primera hora.',
  'Ya tengo el guion de la demo, os lo paso esta tarde.',
  'Esto depende de lo que decida el equipo de diseño, les pregunto hoy.',
  'Lo he probado en móvil y también falla: añado una captura al ticket.',
  'Estoy de acuerdo, mejor lo dejamos para la próxima iteración.',
  'He movido la fecha porque el cliente no podía antes del jueves.',
  'Alguien puede confirmar si esto ya está en producción.',
  'Revisado: solo falta actualizar la documentación.',
  'Me bloquea que no tengo acceso al entorno de pruebas, ¿quién me lo da?',
  'Lo cierro yo, que ya tengo el contexto fresco.',
  'Ojo con el redondeo: en el resumen salen céntimos de más.',
  'Hablé con soporte y confirman que les llegan tres avisos al día por esto.',
  'Propongo partirlo en dos tareas: la migración y la interfaz.',
  'Gracias por el aviso, lo miro en cuanto termine la revisión.',
  'No consigo reproducirlo: ¿en qué navegador te pasa?',
  'Queda pendiente decidir el texto del mensaje de error.',
  'Subo los cambios hoy y pido revisión mañana.',
  'He añadido pruebas para el caso de la fecha vencida.',
  'Esto ya lo habíamos hablado en la reunión del lunes, lo recojo en las notas.',
  'Cuidado: toca también la exportación a hoja de cálculo.',
  'Listo para revisar, falta solo el visto bueno de seguridad.',
  'Lo dejo en pausa hasta que llegue la respuesta del proveedor.',
  'Buena idea, así evitamos duplicar el trabajo.',
  'Ya está desplegado en el entorno de pruebas, ¿alguien puede mirarlo?',
]

function haceUnRato(minutosMaximo: number, faker: Faker) {
  return DateTime.now().minus({ minutes: faker.number.int({ min: 1, max: minutosMaximo }) })
}

/**
 * Un comentario. Lo que el esquema deja pasar y la factory no:
 *
 * - **Texto presentable.** `body` solo exige no nulo: `''` y `'   '` pasan el esquema.
 *   Aquí siempre es una frase en castellano de 1 a 500 caracteres y sin espacios en los
 *   extremos, que es lo que el validador deja entrar (spec `comments`).
 * - **Autor y tarea siempre reales.** Ambas claves foráneas son obligatorias; las
 *   relaciones `task` y `author` los crean con sus factories si no se pasa uno. Esta
 *   factory escribe directo en la base y no aplica la regla de no repetir seguido (es del
 *   servicio): quien cree varios comentarios de una cuenta en una tarea reparte textos
 *   distintos, como hace el seeder.
 * - **Fechas coherentes.** `created_at` en los últimos 30 días, nunca en el futuro, y
 *   `updated_at` igual a `created_at`: un comentario no se edita.
 */
export const CommentFactory = factory
  .define(Comment, ({ faker }) => {
    const createdAt = haceUnRato(30 * 24 * 60, faker)

    return {
      body: faker.helpers.arrayElement(TEXTOS_COMENTARIO),
      createdAt,
      // Sin esto, `autoUpdate` la pondría a «ahora» en el insert.
      updatedAt: createdAt,
    }
  })
  .relation('task', () => TaskFactory)
  .relation('author', () => UserFactory)
  .build()
