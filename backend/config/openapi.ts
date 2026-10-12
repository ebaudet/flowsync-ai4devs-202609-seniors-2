import { defineConfig } from '@foadonis/openapi'

export default defineConfig({
  ui: 'scalar',
  document: {
    info: {
      title: 'FlowSync API',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        // `ApiBearerAuth()` referencia este esquema por su nombre: `bearer`.
        bearer: { type: 'http', scheme: 'bearer' },
      },
    },
  },
})
