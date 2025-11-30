import express from "express";
import { generateTestCases, getTestCases } from "../controllers/testCaseController.js";

const router = express.Router();

// POST → generate test cases
router.post("/tickets/testcases", generateTestCases);

// GET → get test cases for a ticket
router.get("/tickets/testcases/:ticket_id", getTestCases);

export default router;
