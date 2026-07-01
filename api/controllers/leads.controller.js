async function getGoogleAccessToken() {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    grant_type: "refresh_token",
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`No se pudo refrescar el token de Google: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  return data.access_token;
}

async function appendToSheet(accessToken, row) {
  const sheetId = process.env.LEADS_SHEET_ID;
  const tab = process.env.LEADS_SHEET_TAB || "landingpage";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    tab
  )}!A:N:append?valueInputOption=RAW`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`No se pudo escribir en el Sheet: ${resp.status} ${text}`);
  }

  return resp.json();
}

function buildRawEmail({ to, subject, body }) {
  const message = [
    `To: ${to}`,
    `From: Jimenez Drywall Web <${to}>`,
    `Date: ${new Date().toUTCString()}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    body,
  ].join("\r\n");
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendNotificationEmail(accessToken, lead, fecha) {
  const fallback = (value) => (value && String(value).trim() ? value : "—");
  const subject = `Nuevo lead del sitio: ${lead.nombre} ${lead.apellido}`.trim();
  const body = [
    "Nuevo lead recibido desde transformatuproyecto.com",
    "",
    `Nombre: ${lead.nombre} ${lead.apellido}`,
    `Telefono/WhatsApp: ${lead.telefono}`,
    `Email: ${fallback(lead.email)}`,
    `Ciudad: ${fallback(lead.ciudad)}`,
    `Servicio: ${fallback(lead.servicio)}`,
    `Mensaje: ${fallback(lead.mensaje)}`,
    `Preferencia de contacto: ${fallback(lead.preferencia)}`,
    `Pagina de origen: ${fallback(lead.pagina)}`,
    `Idioma: ${fallback(lead.idioma)}`,
    `Fecha: ${fecha}`,
    "",
    "Este lead tambien quedo guardado en el Sheet control-de-leads.",
  ].join("\n");

  const raw = buildRawEmail({ to: process.env.NOTIFY_EMAIL, subject, body });

  const resp = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`No se pudo enviar el correo de notificacion: ${resp.status} ${text}`);
  }

  return resp.json();
}

export const submitLead = async (req, res) => {
  try {
    const {
      nombre = "",
      apellido = "",
      telefono = "",
      email = "",
      ciudad = "",
      servicio = "",
      mensaje = "",
      preferencia = "",
      pagina = "",
      idioma = "",
    } = req.body;

    if (!nombre || !telefono) {
      return res.status(400).json({ status: "error", message: "Faltan 'nombre' y/o 'telefono'." });
    }

    const fecha = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
    const lead = { nombre, apellido, telefono, email, ciudad, servicio, mensaje, preferencia, pagina, idioma };

    const accessToken = await getGoogleAccessToken();

    await appendToSheet(accessToken, [
      fecha,
      nombre,
      apellido,
      telefono,
      email,
      ciudad,
      servicio,
      mensaje,
      preferencia,
      pagina,
      idioma,
      "new",
      "",
      "",
    ]);

    let emailSent = true;
    let emailError = null;
    try {
      await sendNotificationEmail(accessToken, lead, fecha);
    } catch (err) {
      emailSent = false;
      emailError = err.message;
      console.error("Error enviando correo de notificacion:", err.message);
    }

    return res.status(201).json({ status: "success", sheet: true, email: emailSent, emailError });
  } catch (err) {
    console.error("Error en submitLead:", err.message);
    return res.status(500).json({ status: "error", message: err.message || "Error interno del servidor." });
  }
};
