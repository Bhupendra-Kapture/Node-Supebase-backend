import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
app.use(express.json());

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Multer for file upload (stores file in memory)
const upload = multer({ storage: multer.memoryStorage() });


// ====================================================
// GET all issues
// ====================================================
app.get("/issues", async (req, res) => {
    const { data, error } = await supabase
        .from("issues")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
});


// ====================================================
// CREATE issue (with file upload to Supabase Storage)
// ====================================================
app.post("/issues", upload.single("attachment"), async (req, res) => {
    try {
        const {
            customer_name,
            server,
            summary,
            description,
            category,
            priority,
            start_date,
            end_date,
            assignee,
            reporter,
            manager,
            developer
        } = req.body;

        if (!summary) {
            return res.status(400).json({ error: "summary is required" });
        }

        let attachmentUrl = null;

        // If file is included → upload to Supabase Storage
        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;

            const { error: uploadError } = await supabase.storage
                .from("attachments")
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype,
                    upsert: false
                });

            if (uploadError) {
                console.error(uploadError);
                return res.status(500).json({ error: "File upload failed" });
            }

            const { data: publicUrl } = supabase.storage
                .from("attachments")
                .getPublicUrl(fileName);

            attachmentUrl = publicUrl.publicUrl;
        }

        // Insert full record into Supabase DB
        const { data, error } = await supabase
            .from("issues")
            .insert([
                {
                    customer_name,
                    server,
                    summary,
                    description,
                    category,
                    priority,
                    start_date,
                    end_date,
                    assignee,
                    reporter,
                    manager,
                    developer,
                    attachment_url: attachmentUrl
                }
            ])
            .select();

        if (error) return res.status(400).json({ error: error.message });

        res.status(201).json({ success: true, data: data[0] });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ====================================================
// Start server
// ====================================================
app.listen(process.env.PORT || 3000, () => {
    console.log("API running on port " + (process.env.PORT || 3000));
});
