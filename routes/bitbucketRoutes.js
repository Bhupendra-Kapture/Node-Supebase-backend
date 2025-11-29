import express from "express";
import { createBitbucketBranch } from "../controllers/bitbucketController.js";

const router = express.Router();

router.post("/bitbucket/create-branch", createBitbucketBranch);

export default router;
