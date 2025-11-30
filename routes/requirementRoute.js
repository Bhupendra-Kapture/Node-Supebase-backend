import express from "express";
import { generateRequirementChecklist,getRequirementChecklist } from "../controllers/generateRequirementChecklist.js";

const router = express.Router();

// Get requirement of a particular ticket
router.post("/tickets/checklist", generateRequirementChecklist);

// GET: Fetch checklist for a ticket
router.get("/tickets/checklist/:ticket_id", getRequirementChecklist);

export default router;
