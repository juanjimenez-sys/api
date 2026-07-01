import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mailerliteRoutes from "./routes/mailerlite.routes.js";
import leadsRoutes from "./routes/leads.routes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/mailerlite", mailerliteRoutes);
app.use("/api/leads", leadsRoutes);

app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
