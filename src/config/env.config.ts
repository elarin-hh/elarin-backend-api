export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY,
    elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
  },
});
