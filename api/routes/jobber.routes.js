import express from "express";
import { getJobberSummary } from "../controllers/jobber.controller.js";

const router = express.Router();

router.get("/summary", getJobberSummary);

export default router;
