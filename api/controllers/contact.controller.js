const ML_API_BASE = process.env.ML_API_BASE || "https://connect.mailerlite.com/api";

async function mlCreateOrAssignSubscriber({ email, fields }) {
  const ML_API_KEY = process.env.ML_API_KEY;
  const ML_GROUP_ID = process.env.ML_GROUP_ID;

  if (!ML_API_KEY || !ML_GROUP_ID) {
    throw new Error("Faltan ML_API_KEY y/o ML_GROUP_ID en variables de entorno");
  }

  const baseHeaders = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${ML_API_KEY}`,
  };

  const body = JSON.stringify({ email, fields, groups: [ML_GROUP_ID] });

  const createResp = await fetch(`${ML_API_BASE}/subscribers`, {
    method: "POST",
    headers: baseHeaders,
    body,
  });

  if (createResp.ok) return;

  const text = await createResp.text().catch(() => "");

  if (createResp.status === 409 || /already/i.test(text)) {
    const assignResp = await fetch(
      `${ML_API_BASE}/subscribers/${encodeURIComponent(email)}/groups/${ML_GROUP_ID}`,
      {
        method: "POST",
        headers: baseHeaders,
      }
    );
    if (!assignResp.ok) {
      const t2 = await assignResp.text().catch(() => "");
      throw new Error(`No se pudo asignar el suscriptor al grupo: ${assignResp.status} ${t2}`);
    }
    return;
  }

  if (createResp.status === 422) {
    const retry = await fetch(`${ML_API_BASE}/subscribers`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({
        email,
        fields: { name: fields?.name },
        groups: [ML_GROUP_ID],
      }),
    });

    if (retry.ok) return;

    const t3 = await retry.text().catch(() => "");
    throw new Error(`MailerLite aún devuelve 422: ${t3}`);
  }

  throw new Error(`MailerLite request failed: ${createResp.status} ${text}`);
}

export const createContactElite = async (req, res) => {
  try {
    const { name, lastName, phone, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        status: "error",
        message: "Los campos 'name' y 'email' son obligatorios.",
      });
    }

    const mlFields = {
      name: name,
      last_name: lastName,
      phone: phone,
    };

    await mlCreateOrAssignSubscriber({ email, fields: mlFields });

    return res.status(201).json({
      status: "success",
      message: "Contacto enviado correctamente a MailerLite 🚀",
      data: {
        name,
        lastName,
        phone,
        email,
      },
    });
  } catch (err) {
    console.error("Error en createContactElite:", err.message);
    res.status(500).json({
      status: "error",
      message: err.message || "Error interno del servidor.",
    });
  }
};
