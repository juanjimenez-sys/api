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

const BRAND = {
  red: "#E8171E",
  redDark: "#B81217",
  black: "#141414",
  charcoal: "#1A1A1A",
  card: "#242424",
  white: "#FFFFFF",
  muted: "#B8B8B8",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function buildPlainTextBody(lead, fecha, fallback) {
  return [
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
}

function buildHtmlBody(lead, fecha, fallback) {
  const fullName = `${lead.nombre} ${lead.apellido}`.trim();
  const phoneDigits = String(lead.telefono || "").replace(/[^\d+]/g, "");
  const waLink = `https://wa.me/${phoneDigits.replace(/^\+/, "")}`;
  const row = (label, value) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #EDEDED;color:#8A8A8A;font-size:12px;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;width:140px;vertical-align:top;">${label}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #EDEDED;color:#1A1A1A;font-size:14px;font-family:Arial,Helvetica,sans-serif;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${BRAND.black};font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">Nuevo lead: ${escapeHtml(fullName)} — ${escapeHtml(lead.telefono)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.black};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:${BRAND.white};border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.35);">
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND.redDark},${BRAND.red});padding:28px 28px 24px 28px;">
              <p style="margin:0 0 6px 0;color:#FFD9D9;font-size:12px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase;">Jimenez Drywall LLC</p>
              <h1 style="margin:0;color:${BRAND.white};font-size:24px;line-height:1.3;font-family:Arial,Helvetica,sans-serif;">🎯 Nuevo lead del sitio</h1>
              <p style="margin:8px 0 0 0;color:#FFE2E2;font-size:14px;">${escapeHtml(fullName)} quiere que lo contactes</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row("Nombre", fullName)}
                ${row("Telefono", lead.telefono)}
                ${row("Email", fallback(lead.email))}
                ${row("Ciudad", fallback(lead.ciudad))}
                ${row("Servicio", fallback(lead.servicio))}
                ${row("Mensaje", fallback(lead.mensaje))}
                ${row("Prefiere contacto por", fallback(lead.preferencia))}
                ${row("Pagina de origen", fallback(lead.pagina))}
                ${row("Idioma", fallback(lead.idioma))}
                ${row("Fecha", fecha)}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 8px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="50%" style="padding-right:6px;">
                    <a href="tel:${escapeHtml(phoneDigits)}" style="display:block;text-align:center;background-color:${BRAND.red};color:${BRAND.white};text-decoration:none;font-weight:bold;font-size:14px;padding:13px 10px;border-radius:8px;">📞 Llamar ahora</a>
                  </td>
                  <td width="50%" style="padding-left:6px;">
                    <a href="${waLink}" style="display:block;text-align:center;background-color:${BRAND.charcoal};color:${BRAND.white};text-decoration:none;font-weight:bold;font-size:14px;padding:13px 10px;border-radius:8px;">💬 WhatsApp</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 26px 28px;">
              <p style="margin:0;color:#8A8A8A;font-size:12px;text-align:center;">Este lead también quedó guardado en el Sheet <strong>control-de-leads</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:${BRAND.black};padding:16px 28px;text-align:center;">
              <p style="margin:0;color:${BRAND.muted};font-size:11px;">Jimenez Drywall LLC · Moses Lake, WA · transformatuproyecto.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function encodeHeaderText(text) {
  // RFC 2047 encoded-word, necesario para que emojis/acentos no se corrompan en headers de email
  return `=?UTF-8?B?${Buffer.from(text, "utf-8").toString("base64")}?=`;
}

function buildRawEmail({ to, subject, textBody, htmlBody }) {
  const boundary = `boundary_${Date.now()}`;
  const message = [
    `To: ${to}`,
    `From: Jimenez Drywall Web <${to}>`,
    `Date: ${new Date().toUTCString()}`,
    `Subject: ${encodeHeaderText(subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    textBody,
    "",
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    "",
    htmlBody,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sendNotificationEmail(accessToken, lead, fecha) {
  const fallback = (value) => (value && String(value).trim() ? value : "—");
  const subject = `🎯 Nuevo lead: ${lead.nombre} ${lead.apellido}`.trim();
  const textBody = buildPlainTextBody(lead, fecha, fallback);
  const htmlBody = buildHtmlBody(lead, fecha, fallback);

  const raw = buildRawEmail({ to: process.env.NOTIFY_EMAIL, subject, textBody, htmlBody });

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
