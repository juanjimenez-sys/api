const APEX_BASE = "https://plbossavwsxcguvdkjab.supabase.co/functions/v1/apex-public-api";

async function apexGet(path) {
  const resp = await fetch(`${APEX_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.APEX_SUPABASE_KEY}`,
      "x-api-key": process.env.APEX_API_KEY,
    },
  });
  const json = await resp.json();
  if (!resp.ok) {
    throw new Error(json.error || `Apex respondio ${resp.status}`);
  }
  return json;
}

const STAGE_ORDER = [
  "Leads Entrantes",
  "Nuevo Lead",
  "Cotización Enviada",
  "Negociación",
  "Trabajo Adjudicado",
  "En Progreso - En Obra",
  "No Interesado",
];

export const getApexSummary = async (req, res) => {
  try {
    let allLeads = [];
    let offset = 0;
    const limit = 100;
    for (let i = 0; i < 10; i++) {
      const page = await apexGet(`/leads?limit=${limit}&offset=${offset}`);
      allLeads = allLeads.concat(page.data || []);
      if (!page.data || page.data.length < limit) break;
      offset += limit;
    }

    const byStage = {};
    for (const stage of STAGE_ORDER) byStage[stage] = 0;
    let other = 0;
    for (const lead of allLeads) {
      const stage = lead.stage || "Sin etapa";
      if (Object.prototype.hasOwnProperty.call(byStage, stage)) {
        byStage[stage] += 1;
      } else {
        other += 1;
      }
    }

    const pipeline = STAGE_ORDER.map((stage) => ({ stage, count: byStage[stage] }));
    if (other > 0) pipeline.push({ stage: "Otro", count: other });

    const recentLeads = allLeads
      .filter((l) => !l.name?.startsWith("_DELETE_TEST"))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 15)
      .map((l) => ({
        name: [l.name, l.last_name].filter(Boolean).join(" "),
        email: l.email,
        phone: l.phone,
        stage: l.stage,
        dealValue: l.deal_value,
        createdAt: l.created_at,
        origin: l.origin,
      }));

    return res.status(200).json({
      status: "success",
      total: allLeads.length,
      pipeline,
      recentLeads,
    });
  } catch (err) {
    console.error("Error en getApexSummary:", err.message);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
