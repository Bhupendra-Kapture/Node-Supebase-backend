import supabase from "../config/supabaseClient.js";

// ----------------------------------------------------
// ADD COMMENT TO A TICKET
// ----------------------------------------------------
export const addTicketComment = async (req, res) => {
    try {
        const { ticket_id, person_name, category, message } = req.body;

        // Validate
        if (!ticket_id || !person_name || !category || !message) {
            return res.status(400).json({
                error: "ticket_id, person_name, category, and message are required"
            });
        }

        // Insert comment
        const { data, error } = await supabase
            .from("ticket_comments")
            .insert([
                {
                    ticket_id: Number(ticket_id),   // important
                    person_name,
                    category,
                    message
                }
            ])
            .select();

        if (error) return res.status(400).json({ error: error.message });

        res.status(201).json({
            success: true,
            message: "Comment added successfully",
            data: data[0]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ----------------------------------------------------
// GET ALL COMMENTS FOR A TICKET
// ----------------------------------------------------
export const getTicketComments = async (req, res) => {
    try {
        const ticketId = req.params.ticketId;

        const { data, error } = await supabase
            .from("ticket_comments")
            .select("*")
            .eq("ticket_id", Number(ticketId))
            .order("created_at", { ascending: true });

        if (error) return res.status(400).json({ error: error.message });

        res.json(data);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ----------------------------------------------------
// DELETE COMMENT BY ID
// ----------------------------------------------------
export const deleteTicketComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        const { error } = await supabase
            .from("ticket_comments")
            .delete()
            .eq("id", commentId);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            success: true,
            message: "Comment deleted successfully"
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ----------------------------------------------------
// UPDATE COMMENT BY ID
// ----------------------------------------------------
export const updateTicketComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const { person_name, category, message } = req.body;

        // Validate
        if (!person_name && !category && !message) {
            return res.status(400).json({
                error: "At least one field (person_name, category, message) is required"
            });
        }

        const updatePayload = {};
        if (person_name) updatePayload.person_name = person_name;
        if (category) updatePayload.category = category;
        if (message) updatePayload.message = message;

        const { data, error } = await supabase
            .from("ticket_comments")
            .update(updatePayload)
            .eq("id", commentId)
            .select();

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        res.json({
            success: true,
            message: "Comment updated successfully",
            data: data[0]
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
