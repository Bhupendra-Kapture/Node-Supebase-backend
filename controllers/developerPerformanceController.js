import Anthropic from "@anthropic-ai/sdk";
import supabase from "../config/supabaseClient.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const getDeveloperPerformance = async (req, res) => {
  try {
    const developer = req.params.name;

    if (!developer) {
      return res.status(400).json({ error: "Developer name is required" });
    }

    // Fetch all reports for this developer
    const { data: reports, error } = await supabase
      .from("progress_reports")
      .select("*")
      .eq("generated_by", developer)
      .order("generated_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    if (!reports || reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No reports found for this developer"
      });
    }

    // Build analysis prompt
    const prompt = `
You are a senior engineering manager.
Analyze the following development progress reports and produce a
CONCISE & ACCURATE summary of the developer's overall performance.

### Developer Name:
${developer}

### Reports:
${reports.map(r => `
{
  "ticket_id": "${r.ticket_id}",
  "completion_percentage": ${r.completion_percentage},
  "status": "${r.status}",
  "completed_features": ${JSON.stringify(r.completed_features)},
  "in_progress": ${JSON.stringify(r.in_progress)},
  "pending_work": ${JSON.stringify(r.pending_work)},
  "code_quality": "${r.code_quality}",
  "overall_assessment": "${r.overall_assessment}",
  "recommendations": ${JSON.stringify(r.recommendations)},
  "generated_at": "${r.generated_at}"
}
`).join("\n")}

### Return JSON ONLY in this structure:
{
  "developer": "${developer}",
  "total_reports": ${reports.length},
  "strengths": [],
  "weaknesses": [],
  "consistency_score": 0, 
  "quality_score": 0,
  "reliability_score": 0,
  "overall_rating": 0,
  "final_summary": ""
}
`;

    // Claude analysis
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

    const analysis = JSON.parse(jsonMatch[0]);

    return res.json({
      success: true,
      developer,
      performance_report: analysis
    });

  } catch (err) {
    console.error("Developer Performance Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
