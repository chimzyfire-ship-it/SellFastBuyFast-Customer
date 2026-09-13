module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ success: false });
  // Explicit public allowlist. Never serialize process.env or server secrets.
  const data = {
    apiUrl: process.env.ADMIN_API_URL || '',
    supabaseUrl: process.env.ADMIN_SUPABASE_URL || '',
    supabaseAnonKey: process.env.ADMIN_SUPABASE_ANON_KEY || '',
  };
  return res.status(200).json({ success: true, data });
};
