import supabase from "../config/supabaseClient.js";

export const handleBitbucketWebhook = async (req, res) => {
  try {
    const event = req.headers["x-event-key"];
    const body = req.body;

    console.log("Webhook Event:", event);

    // Get branch name
    const branchName =
      body.pullrequest?.source?.branch?.name ||
      body.push?.changes?.[0]?.new?.name ||
      null;

    if (!branchName) {
      return res.json({ success: true, message: "Branch name not found" });
    }

    console.log("Webhook branch:", branchName);

    // Find branch in ticket_branches table
    const { data: branchRecord, error: branchError } = await supabase
      .from("ticket_branches")
      .select("*")
      .eq("branch_name", branchName)
      .single();

    if (branchError || !branchRecord) {
      console.log("No matching branch in ticket_branches, ignoring");
      return res.json({ success: true, message: "Branch not tracked in DB" });
    }

    const ticket_id = branchRecord.ticket_id;
    console.log("Ticket ID found:", ticket_id);

    let newStatus = null;
    const now = new Date().toISOString();
    let updateData = {};

    switch (event) {
      case "repo:push":
        newStatus = "in_progress";
        updateData = {
          status: newStatus,
          in_progress_at: now
        };
        break;

      case "pullrequest:created":
        newStatus = "in_testing";
        updateData = {
          status: newStatus,
          in_testing_at: now
        };
        break;

      case "pullrequest:approved":
        newStatus = "ready_for_review";
        updateData = {
          status: newStatus,
          ready_for_review_at: now
        };
        break;

      case "pullrequest:fulfilled":
        newStatus = "completed";
        updateData = {
          status: newStatus,
          completed_at: now
        };
        break;

      default:
        return res.json({ success: true, message: "Event ignored" });
    }

    // Update ticket with status and timestamp
    await supabase
      .from("tickets")
      .update(updateData)
      .eq("id", ticket_id);

    return res.json({
      success: true,
      message: "Ticket status + timestamps updated",
      ticket_id,
      update: updateData,
      event,
      branch: branchName
    });

  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
