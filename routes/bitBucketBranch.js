import express from "express";
import { getBranchesByTicket } from "../controllers/branchController.js";

const router = express.Router();

// Get branches for a specific ticket
router.get("/bitbucket/get/:ticket_id", getBranchesByTicket);

export default router;
