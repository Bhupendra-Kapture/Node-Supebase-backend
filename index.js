import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
app.use(express.json());

// Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// GET all items
app.get("/issues", async (req, res) => {
    const { data, error } = await supabase.from("issues").select("*");

    if (error) return res.status(400).json({ error: error.message });

    res.json(data);
});
  

// POST item
app.post("/issues", async (req, res) => {
    try {
        const {
            summary,
            description,
            priority,
            end_date,
            customer_name,
            server,
            category,
            assignee,
            reporror,
            manager,
            developer
        } = req.body;

        if (!summary) {
            return res.status(400).json({ error: "summary is required" });
        }

        const { data, error } = await supabase
            .from("issues")
            .insert([
                {
                    summary,
                    description,
                    priority,
                    end_date,
                    customer_name,
                    server,
                    category,
                    assignee,
                    reporror,
                    manager,
                    developer
                }
            ])
            .select(); // returns created record

        if (error) return res.status(400).json({ error: error.message });

        res.status(201).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
  
app.listen(process.env.PORT, () => {
  console.log("API running on port " + process.env.PORT);
});
