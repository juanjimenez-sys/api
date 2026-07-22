import express from "express";
import { getTeam } from "../controllers/team.controller.js";

const router = express.Router();

router.get("/", getTeam);

export default router;
