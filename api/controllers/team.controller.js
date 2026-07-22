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

export const getTeam = async (req, res) => {
  try {
    const sheetId = process.env.TEAM_SHEET_ID;
    const accessToken = await getGoogleAccessToken();

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Equipo!A2:E100`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`No se pudo leer el Sheet de equipo: ${resp.status} ${text}`);
    }

    const data = await resp.json();
    const rows = data.values || [];

    const team = rows
      .filter((r) => r[0])
      .map((r) => ({
        name: r[0] || "",
        role: r[1] || "",
        weeklyPay: r[2] ? Number(r[2]) : null,
        active: (r[3] || "").toLowerCase() !== "no",
        notes: r[4] || "",
      }));

    const totalWeeklyPayroll = team.reduce((sum, m) => sum + (m.weeklyPay || 0), 0);

    return res.status(200).json({ status: "success", team, totalWeeklyPayroll });
  } catch (err) {
    console.error("Error en getTeam:", err.message);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
