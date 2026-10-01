import { type SchemaRules } from '@adonisjs/lucid/types/schema_generator'

export default {
  tables: {
    tasks: {
      columns: {
        status: { tsType: `'pending' | 'in_progress' | 'done'`, decorators: [{ name: '@column' }] },
      },
    },
  },
} satisfies SchemaRules
