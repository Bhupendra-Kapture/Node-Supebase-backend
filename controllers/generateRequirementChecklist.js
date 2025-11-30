import Anthropic from "@anthropic-ai/sdk";
import supabase from "../config/supabaseClient.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const generateRequirementChecklist = async (req, res) => {
  try {
    const { ticket_id } = req.body;

    if (!ticket_id) {
      return res.status(400).json({
        error: "ticket_id is required"
      });
    }

    // Fetch ticket
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (ticketErr || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const prompt = `
You are a senior technical business analyst.
Your job is to analyze a client requirement and return
EVERYTHING the developer will need before development can begin.

Return ONLY valid JSON.

## Requirement
Summary: ${ticket.summary}
Description: ${ticket.description}

## Output JSON Structure:
{
  "missing_information": [],
  "required_apis": [],
  "business_rules": [],
  "ui_dependencies": [],
  "developer_questions": [],
  "risks": [],
  "suggestions": []
}
`;

    // Claude call
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }]
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Claude did not return valid JSON");
    }

    const aiOutput = JSON.parse(jsonMatch[0]);

    // Save into table
    const { data: insertData, error: insertErr } = await supabase
      .from("requirement_inputs")
      .insert([{
        ticket_id,
        missing_information: aiOutput.missing_information,
        required_apis: aiOutput.required_apis,
        business_rules: aiOutput.business_rules,
        ui_dependencies: aiOutput.ui_dependencies,
        developer_questions: aiOutput.developer_questions,
        risks: aiOutput.risks,
        suggestions: aiOutput.suggestions
      }])
      .select();

    if (insertErr) {
      throw insertErr;
    }

    return res.json({
      success: true,
      message: "Requirement checklist generated successfully",
      ticket_id,
      checklist: insertData[0]
    });

  } catch (err) {
    console.error("Checklist Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};


export const getRequirementChecklist = async (req, res) => {
  try {
    const { ticket_id } = req.params;

    if (!ticket_id) {
      return res.status(400).json({ error: "ticket_id is required" });
    }

    const { data, error } = await supabase
      .from("requirement_inputs")
      .select("*")
      .eq("ticket_id", ticket_id)
      .order("generated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No checklist found for this ticket"
      });
    }

    return res.json({
      success: true,
      ticket_id,
      total: data.length,
      checklist: data
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
