import express from "express";
import { handleBitbucketWebhook } from "../controllers/bitbucketWebhookController.js";

const router = express.Router();

// Bitbucket webhook will POST here
router.post("/bitbucket/webhook", handleBitbucketWebhook);

export default router;
