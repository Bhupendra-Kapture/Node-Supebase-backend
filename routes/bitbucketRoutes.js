import express from "express";
import { 
  createBitbucketBranch,
  generateProgressReport,
  getTicketReports
} from "../controllers/bitbucketController.js";

const router = express.Router();

// Branch Management
router.post("/bitbucket/create-branch", createBitbucketBranch);

// AI Progress Reports
router.post("/bitbucket/progress-report", generateProgressReport);
router.get("/bitbucket/reports/:ticket_id", getTicketReports);

export default router;