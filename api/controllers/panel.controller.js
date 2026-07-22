import { getJobberSummary } from "./jobber.controller.js";
import { getApexSummary } from "./apex.controller.js";
import { getTeam } from "./team.controller.js";

function collect(fn) {
  return new Promise((resolve) => {
    const fakeRes = {
      _status: 200,
      status(code) {
        this._status = code;
        return this;
      },
      json(payload) {
        resolve({ ok: this._status < 400, payload });
      },
    };
    fn({}, fakeRes).catch((err) =>
      resolve({ ok: false, payload: { status: "error", message: err.message } })
    );
  });
}

export const getPanelSummary = async (req, res) => {
  const [jobber, apex, team] = await Promise.all([
    collect(getJobberSummary),
    collect(getApexSummary),
    collect(getTeam),
  ]);

  return res.status(200).json({
    status: "success",
    jobber: jobber.ok ? jobber.payload : { error: jobber.payload.message },
    apex: apex.ok ? apex.payload : { error: apex.payload.message },
    team: team.ok ? team.payload : { error: team.payload.message },
  });
};
