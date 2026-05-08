export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-troque-em-producao',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '',
  },
  cardapioweb: {
    baseUrl: process.env.CARDAPIOWEB_BASE_URL || 'https://api.cardapioweb.com.br/v1',
    timeoutMs: parseInt(process.env.CARDAPIOWEB_TIMEOUT_MS || '10000', 10),
  },
  reconciliador: {
    cron: process.env.RECONCILIADOR_CRON || '*/10 * * * *',
  },
});
