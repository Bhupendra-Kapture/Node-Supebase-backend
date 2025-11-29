// routes/googleRoutes.js
import express from "express";
import { generateAuthUrl, googleCallback } from "../controllers/googleController.js";

const router = express.Router();

router.get("/google/auth", generateAuthUrl);      // returns URL to open
router.get("/google/callback", googleCallback);   // google redirect URI

export default router;
