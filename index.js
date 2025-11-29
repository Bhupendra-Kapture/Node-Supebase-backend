import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

import ticketRoutes from "./routes/ticketRoutes.js";
import ticketCommentRoutes from "./routes/ticketCommentRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());

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

// Start server
app.listen(process.env.PORT || 3000, () => {
    console.log("API running on port " + (process.env.PORT || 3000));
});
