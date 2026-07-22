export async function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ status: "error", message: "No autorizado." });
  }

  try {
    const resp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.SUPABASE_ANON_KEY,
      },
    });

    if (!resp.ok) {
      return res.status(401).json({ status: "error", message: "Sesión inválida o expirada." });
    }

    const user = await resp.json();
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ status: "error", message: "No se pudo verificar la sesión." });
  }
}
