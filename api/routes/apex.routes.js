import express from "express";
import { getApexSummary } from "../controllers/apex.controller.js";

const router = express.Router();

router.get("/summary", getApexSummary);

export default router;
