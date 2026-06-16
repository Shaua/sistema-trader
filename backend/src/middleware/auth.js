const supabase = require('../config/supabase');

/**
 * Middleware de autenticação via Supabase JWT
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Upsert profile and get role
    let { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
    if (!profile) {
      const newProfile = {
        id: user.id,
        name: user.user_metadata?.full_name || user.email,
        email: user.email,
        avatar_url: user.user_metadata?.avatar_url,
        role: 'trader'
      };
      await supabase.from('user_profiles').insert(newProfile);
      profile = { role: 'trader' };
    }

    req.user = user;
    req.userId = user.id;
    req.userRole = profile.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Erro de autenticação' });
  }
}

module.exports = authMiddleware;
