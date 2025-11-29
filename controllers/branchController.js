import supabase from "../config/supabaseClient.js";

export const getBranchesByTicket = async (req, res) => {
  try {
    const ticket_id = req.params.ticket_id;

    const { data, error } = await supabase
      .from("ticket_branches")
      .select("*")
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ error: error.message });

    res.json({
      success: true,
      branches: data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
