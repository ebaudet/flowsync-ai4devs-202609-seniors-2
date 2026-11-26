import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Los comentarios de una tarea (spec `comments`). Tabla nueva: no hay filas que contar
 * ni que mover (convención 5), así que la migración no transforma datos.
 *
 * Rama (convención 5): REVERSIBLE respecto a los datos que existen hoy, que son ninguno.
 * Lo que `down()` descarta es la tabla entera y, con ella, todos los comentarios que haya
 * en ese momento: no hay forma de recuperarlos después. Con la tabla vacía no pierde nada.
 *
 * Valores cerrados (convención 2): ninguno. `body` es texto libre; su longitud (1 a 500
 * tras recortar) y la no repetición seguida las impone la aplicación, porque no son un
 * conjunto cerrado de valores y la segunda depende de otros comentarios.
 *
 * Índice `(task_id, author_id, id)`: lo pide la consulta de la regla de no repetición,
 * «el último comentario de esta cuenta en esta tarea»
 * (`WHERE task_id = ? AND author_id = ? ORDER BY id DESC LIMIT 1`): igualdad en las dos
 * primeras columnas y orden por la tercera, así que se resuelve leyendo una sola entrada
 * del índice. Su prefijo `task_id` sirve además para sacar el hilo de una tarea y para
 * el borrado en cascada.
 */
export default class extends BaseSchema {
  protected tableName = 'comments'

  async down() {
    this.schema.dropTable(this.tableName)
  }

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').notNullable()

      table
        .integer('task_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('tasks')
        // CASCADE: un comentario no tiene sentido sin su tarea. La aplicación nunca borra
        // la fila de una tarea (la papelera solo marca `deleted_at`, y los comentarios de
        // una tarea en la papelera se conservan para cuando se restaure); esto solo actúa
        // si un borrado físico de verdad (purga, limpieza a mano) se lleva la tarea, y
        // entonces no deben quedar comentarios huérfanos.
        .onDelete('CASCADE')

      table
        .integer('author_id')
        .notNullable()
        .unsigned()
        .references('id')
        .inTable('users')
        // CASCADE, igual que `tasks.assignee_id`: borrar una cuenta ya se lleva sus tareas,
        // y sus comentarios son suyos del mismo modo. Es una decisión de negocio revisable:
        // RESTRICT conservaría los hilos ajenos pero impediría borrar a quien haya comentado,
        // y SET NULL exigiría un autor nulo que el contrato (`author` siempre presente) no admite.
        .onDelete('CASCADE')

      table.text('body').notNullable()

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['task_id', 'author_id', 'id'], 'comments_task_author_id_idx')
    })
  }
}
