let cachedToken = null;
let cachedTokenExpiry = 0;

async function getJobberAccessToken() {
  if (cachedToken && Date.now() < cachedTokenExpiry) return cachedToken;

  const params = new URLSearchParams({
    client_id: process.env.JOBBER_CLIENT_ID,
    client_secret: process.env.JOBBER_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: process.env.JOBBER_REFRESH_TOKEN,
  });

  const resp = await fetch("https://api.getjobber.com/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`No se pudo renovar el token de Jobber: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken;
}

async function jobberQuery(query, variables) {
  const token = await getJobberAccessToken();
  const resp = await fetch("https://api.getjobber.com/api/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "X-JOBBER-GRAPHQL-VERSION": "2025-04-16",
    },
    body: JSON.stringify({ query, variables: variables || {} }),
  });

  const json = await resp.json();
  if (json.errors) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data;
}

const JOBS_QUERY = `
query getJobs($cursor: String) {
  jobs(first: 100, after: $cursor) {
    nodes {
      id
      jobNumber
      title
      jobStatus
      startAt
      endAt
      completedAt
      createdAt
      total
      invoicedTotal
      client { name companyName }
      property { address { street city province } }
    }
    pageInfo { hasNextPage endCursor }
  }
}
`;

const LIVE_STATUSES = new Set([
  "late",
  "requires_invoicing",
  "today",
  "active",
  "action_required",
  "unscheduled",
]);

export const getJobberSummary = async (req, res) => {
  try {
    let allJobs = [];
    let cursor = null;
    // Only 2 pages max (200 jobs) to keep this endpoint fast; plenty for current scale.
    for (let i = 0; i < 2; i++) {
      const data = await jobberQuery(JOBS_QUERY, { cursor });
      allJobs = allJobs.concat(data.jobs.nodes);
      if (!data.jobs.pageInfo.hasNextPage) break;
      cursor = data.jobs.pageInfo.endCursor;
    }

    const liveJobs = allJobs
      .filter((j) => LIVE_STATUSES.has(j.jobStatus))
      .map((j) => ({
        jobNumber: j.jobNumber,
        title: j.title,
        status: j.jobStatus,
        client: j.client?.companyName || j.client?.name || "—",
        address: j.property?.address
          ? [j.property.address.street, j.property.address.city].filter(Boolean).join(", ")
          : "—",
        total: j.total || 0,
        invoicedTotal: j.invoicedTotal || 0,
        startAt: j.startAt,
        endAt: j.endAt,
      }))
      .sort((a, b) => (b.total || 0) - (a.total || 0));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const invoicedThisMonth = allJobs
      .filter((j) => j.completedAt && new Date(j.completedAt) >= monthStart)
      .reduce((sum, j) => sum + (j.invoicedTotal || 0), 0);

    const pendingInvoicing = allJobs
      .filter((j) => j.jobStatus === "requires_invoicing")
      .reduce((sum, j) => sum + (j.total || 0), 0);

    const summary = {
      totalJobsTracked: allJobs.length,
      liveJobsCount: liveJobs.length,
      lateCount: allJobs.filter((j) => j.jobStatus === "late").length,
      requiresInvoicingCount: allJobs.filter((j) => j.jobStatus === "requires_invoicing").length,
      unscheduledCount: allJobs.filter((j) => j.jobStatus === "unscheduled").length,
      pendingInvoicing,
      invoicedThisMonth,
    };

    return res.status(200).json({ status: "success", summary, jobs: liveJobs });
  } catch (err) {
    console.error("Error en getJobberSummary:", err.message);
    return res.status(500).json({ status: "error", message: err.message });
  }
};
