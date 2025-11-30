import Anthropic from "@anthropic-ai/sdk";
import supabase from "../config/supabaseClient.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// =============================
// GENERATE TEST CASES
// =============================
export const generateTestCases = async (req, res) => {
  try {
    const { ticket_id } = req.body;

    if (!ticket_id) {
      return res.status(400).json({ error: "ticket_id is required" });
    }

    // Fetch ticket details
    const { data: ticket, error: errTicket } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (errTicket || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // =============================
    // PROMPT
    // =============================
    const prompt = `
        You are a Senior QA Architect. Generate ONLY the most important edge cases and 1–2 critical test cases for this requirement.

        ### REQUIREMENT
        Summary: ${ticket.summary}
        Description: ${ticket.description || "No description provided"}

        ### RULES
        - Output ONLY valid JSON (no extra text).
        - Keep test cases concise but developer-friendly.
        - Include:
        - edge_cases (all tricky scenarios)
        - critical_tests (1–2 essential functional tests)
        - Each test must include:
        test_name, objective, steps[], expected_result.

        ### JSON STRUCTURE:
        {
        "critical_tests": [
            {
            "test_name": "",
            "objective": "",
            "steps": [],
            "expected_result": ""
            }
        ],
        "edge_cases": [
            {
            "scenario": "",
            "steps": [],
            "expected_result": ""
            }
        ]
        }
        `;

    // Call Claude
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) throw new Error("Claude did not return valid JSON");

    const testCases = JSON.parse(jsonMatch[0]);

    // Save in DB
    const { data: saved, error: saveErr } = await supabase
      .from("ticket_test_cases")
      .insert([
        {
          ticket_id,
          test_cases: testCases,
        },
      ])
      .select();

    if (saveErr) throw new Error(saveErr.message);

    return res.json({
      success: true,
      message: "Test cases generated successfully",
      ticket_id,
      test_cases: saved[0],
    });

  } catch (err) {
    console.error("Test Case Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};


// =============================
// FETCH TEST CASES
// =============================
export const getTestCases = async (req, res) => {
  try {
    const { ticket_id } = req.params;

    const { data, error } = await supabase
      .from("ticket_test_cases")
      .select("*")
      .eq("ticket_id", ticket_id)
      .order("generated_at", { ascending: false });

    if (error) throw new Error(error.message);

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No test cases found for this ticket",
      });
    }

    res.json({
      success: true,
      ticket_id,
      total: data.length,
      test_cases: data,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
