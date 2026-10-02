import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  tables: {
    tasks: {
      columns: {
        status: { tsType: `'pending' | 'in_progress' | 'done'`, decorators: [{ name: '@column' }] },
        // Calendar day as 'YYYY-MM-DD' text: a DateTime would drag a time zone along.
        due_date: { tsType: 'string', decorators: [{ name: '@column' }] },
      },
    },
  },
} satisfies SchemaRules
