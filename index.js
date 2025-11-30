import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

import ticketRoutes from "./routes/ticketRoutes.js";
import ticketCommentRoutes from "./routes/ticketCommentRoutes.js";
import googleRoutes from "./routes/googleRoutes.js";
import bitbucketRoutes from "./routes/bitbucketRoutes.js";
import branchRoutes from "./routes/bitBucketBranch.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import requirementRoute from "./routes/requirementRoute.js"
dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// File upload
const upload = multer({ storage: multer.memoryStorage() });

// ===============================================
// TICKET ROUTES
// ===============================================
app.use("/api", ticketRoutes);

// ===============================================
// COMMENT ROUTES
// ===============================================
app.use("/api", ticketCommentRoutes);


// ===============================================
// google ROUTES
// ===============================================

app.use("/api", googleRoutes);

// ===============================================
// bitbucket ROUTES
// ===============================================

app.use("/api", bitbucketRoutes);

// ===============================================
// branch ROUTES
// ===============================================

app.use("/api", branchRoutes);

// ===============================================
// webhook ROUTES
// ===============================================

app.use("/api", webhookRoutes);

// ===============================================
// requirement ROUTES
// ===============================================

app.use("/api",requirementRoute);

// Start server
app.listen(process.env.PORT || 3000, () => {
    console.log("API running on port " + (process.env.PORT || 3000));
});
