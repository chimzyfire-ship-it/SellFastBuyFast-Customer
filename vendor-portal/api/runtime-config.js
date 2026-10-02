module.exports = (request, response) => {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ success: false, error: { message: 'Method not allowed.' } });
    return;
  }

  const configured = (name, fallback) => String(process.env[name] || '').trim() || fallback;
  const apiUrl = configured('VENDOR_API_URL', 'https://sell-fast-buy-fast-core-api.vercel.app');
  const supabaseUrl = configured('VENDOR_SUPABASE_URL', 'https://fuqrhfxptybipxbzveyy.supabase.co');
  const supabaseAnonKey = configured('VENDOR_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1cXJoZnhwdHliaXB4Ynp2ZXl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5NDY3MjYsImV4cCI6MjEwMzUyMjcyNn0.Q240FBpikqiWaGytkVP1RWVHGA-ZpvdVicY9qf4pvWw');
  // OTP email is a deliberate post-SMTP release step. Link confirmation is
  // the safe fallback while Supabase's hosted default mailer is in use.
  const emailConfirmationMode = String(process.env.VENDOR_EMAIL_CONFIRMATION_MODE || '').trim() === 'otp' ? 'otp' : 'link';

  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.status(200).json({
    success: true,
    data: {
      apiUrl,
      supabaseUrl,
      supabaseAnonKey,
      emailConfirmationMode,
    },
  });
};
