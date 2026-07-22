import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mailerliteRoutes from "./routes/mailerlite.routes.js";
import leadsRoutes from "./routes/leads.routes.js";
import jobberRoutes from "./routes/jobber.routes.js";
import apexRoutes from "./routes/apex.routes.js";
import teamRoutes from "./routes/team.routes.js";
import { getPanelSummary } from "./controllers/panel.controller.js";
import { requireAdmin } from "./middleware/requireAdmin.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/mailerlite", mailerliteRoutes);
app.use("/api/leads", leadsRoutes);
app.use("/api/jobber", requireAdmin, jobberRoutes);
app.use("/api/apex", requireAdmin, apexRoutes);
app.use("/api/team", requireAdmin, teamRoutes);
app.get("/api/panel-summary", requireAdmin, getPanelSummary);

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
