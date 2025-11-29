import supabase from "../config/supabaseClient.js";

// ===============================================
// GET ALL TICKETS
// ===============================================
export const getAllTickets = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("tickets")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) return res.status(400).json({ error: error.message });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ===============================================
// GET ONE TICKET
// ===============================================
export const getTicketById = async (req, res) => {
    try {
        const ticketId = req.params.id;

        const { data, error } = await supabase
            .from("tickets")
            .select("*")
            .eq("id", Number(ticketId))
            .single();

        if (error) return res.status(404).json({ error: "Ticket not found" });

        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ===============================================
// CREATE TICKET
// ===============================================
export const createTicket = async (req, res) => {
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

        // File upload
        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;

            const { error: uploadError } = await supabase.storage
                .from("attachments")
                .upload(fileName, req.file.buffer, {
                    contentType: req.file.mimetype
                });

            if (uploadError) {
                return res.status(500).json({ error: "File upload failed" });
            }

            const { data: urlData } = supabase.storage
                .from("attachments")
                .getPublicUrl(fileName);

            attachmentUrl = urlData.publicUrl;
        }

        const { data, error } = await supabase
            .from("tickets")
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
};
