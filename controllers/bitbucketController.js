// ==========================================
// controllers/bitbucketController.js
// ==========================================
import axios from "axios";
import Anthropic from "@anthropic-ai/sdk";
import supabase from "../config/supabaseClient.js";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Create Bitbucket Branch
export const createBitbucketBranch = async (req, res) => {
  try {
    const { ticket_id, workspace, repo_slug, branch_name, base_branch, created_by } = req.body;

    if (!workspace || !repo_slug || !branch_name || !base_branch || !ticket_id) {
      return res.status(400).json({ 
        error: "Missing required fields.",
        required: ["ticket_id", "workspace", "repo_slug", "branch_name", "base_branch"]
      });
    }

    const apiToken = process.env.BITBUCKET_API_TOKEN;
    if (!apiToken) {
      return res.status(500).json({ error: "Bitbucket credentials not configured" });
    }

    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    };

    // Get commit hash of base branch
    const branchUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}/refs/branches/${base_branch}`;
    
    let commitHash;
    try {
      const branchResponse = await axios.get(branchUrl, { headers });
      commitHash = branchResponse.data.target.hash;
      console.log(`Base branch '${base_branch}' commit hash: ${commitHash}`);
    } catch (err) {
      if (err.response?.status === 404) {
        return res.status(404).json({ error: `Base branch '${base_branch}' not found` });
      }
      throw err;
    }

    // Create new branch
    const createUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}/refs/branches`;
    let branchResponse;
    
    try {
      branchResponse = await axios.post(createUrl, {
        name: branch_name,
        target: { hash: commitHash }
      }, { headers });
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error?.message?.includes("already exists")) {
        return res.status(409).json({ 
          error: `Branch '${branch_name}' already exists`,
          suggestion: "Use a different branch name"
        });
      }
      throw err;
    }

    const createdBranchUrl = branchResponse.data.links?.html?.href || null;
    
    // Save to Supabase
    const { data: branchData, error: branchError } = await supabase
      .from("ticket_branches")
      .insert([{
        ticket_id,
        branch_name,
        repo_slug,
        workspace,
        commit_hash: commitHash,
        created_by: created_by || null,
        branch_url: createdBranchUrl,
        status: 'active'
      }])
      .select();

    if (branchError) {
      console.error("Supabase Insert Error:", branchError.message);
      return res.status(207).json({
        success: true,
        warning: "Branch created in Bitbucket but failed to log in database",
        bitbucket: { branch_name, branch_url: createdBranchUrl, commit_hash: commitHash },
        database_error: branchError.message
      });
    }

    res.status(201).json({
      success: true,
      message: "Branch created and logged successfully",
      data: {
        branch_name,
        branch_url: createdBranchUrl,
        commit_hash: commitHash,
        workspace,
        repo_slug,
        ticket_id,
        database_id: branchData?.[0]?.id
      }
    });

  } catch (err) {
    console.error("Bitbucket Branch Error:", err.response?.data || err.message);
    const statusCode = err.response?.status || 500;
    res.status(statusCode).json({
      success: false,
      error: err.response?.data?.error?.message || err.message,
      details: err.response?.data || null
    });
  }
};

// Helper: Fetch commits and diffs
async function getCommitDiffs(workspace, repoSlug, targetBranch, bitbucketToken) {
  const headers = {
    'Authorization': `Bearer ${bitbucketToken}`,
    'Content-Type': 'application/json'
  };

  try {
    const commitsUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/commits/${targetBranch}`;
    const commitsResponse = await axios.get(commitsUrl, { headers, params: { pagelen: 10 } });
    
    const commits = commitsResponse.data.values || [];
    const diffData = [];

    for (const commit of commits.slice(0, 5)) {
      const diffUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/diff/${commit.hash}`;
      
      try {
        const diffResponse = await axios.get(diffUrl, { headers });
        diffData.push({
          hash: commit.hash,
          message: commit.message,
          author: commit.author?.user?.display_name || commit.author?.raw || 'Unknown',
          date: commit.date,
          diff: diffResponse.data
        });
      } catch (err) {
        console.error(`Failed to fetch diff for ${commit.hash}:`, err.message);
      }
    }

    return diffData;
  } catch (error) {
    throw new Error(`Failed to fetch commits: ${error.message}`);
  }
}

// Helper: Analyze with Claude
async function analyzeWithClaude(commits, ticketInfo) {
  const prompt = `You are a technical project manager analyzing code changes.

## Ticket Information:
**Summary:** ${ticketInfo.summary}
**Description:** ${ticketInfo.description || "No description"}
**Priority:** ${ticketInfo.priority || "Not set"}
**Developer:** ${ticketInfo.developer || "Not assigned"}

## Code Changes (${commits.length} commits):
${commits.map(c => `
### Commit: ${c.message}
**Author:** ${c.author}
**Date:** ${c.date}

\`\`\`diff
${c.diff.substring(0, 3000)}
\`\`\`
`).join('\n')}

Analyze and provide JSON:
{
  "completion_percentage": 75,
  "status": "in_progress",
  "completed_features": ["feature 1", "feature 2"],
  "in_progress": ["feature 3"],
  "pending_work": ["feature 4"],
  "code_quality": "Brief assessment",
  "overall_assessment": "Summary",
  "recommendations": ["rec 1", "rec 2"]
}

Status must be: "just_started", "in_progress", or "completed"`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }]
  });

  const responseText = message.content[0].text;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  
  throw new Error("Claude did not return valid JSON");
}

// Generate Progress Report
export const generateProgressReport = async (req, res) => {
  try {
    const { ticket_id, branch_name, workspace, repo_slug } = req.body;

    if (!ticket_id || !branch_name || !workspace || !repo_slug) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["ticket_id", "branch_name", "workspace", "repo_slug"]
      });
    }

    const bitbucketToken = process.env.BITBUCKET_API_TOKEN;
    
    if (!bitbucketToken || !process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        error: "Missing API credentials"
      });
    }

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    // Get branch details
    const { data: branch } = await supabase
      .from("ticket_branches")
      .select("*")
      .eq("ticket_id", ticket_id)
      .eq("branch_name", branch_name)
      .single();

    if (!branch) {
      return res.status(404).json({
        error: "Branch not found for this ticket"
      });
    }

    // Fetch commits
    console.log(`Fetching commits for branch: ${branch_name}`);
    const commits = await getCommitDiffs(workspace, repo_slug, branch_name, bitbucketToken);

    if (commits.length === 0) {
      return res.status(404).json({ error: "No commits found" });
    }

    // Analyze with Claude
    console.log("Analyzing with Claude AI...");
    const analysis = await analyzeWithClaude(commits, ticket);

    // Save report
    const { data: reportData, error: reportError } = await supabase
      .from("progress_reports")
      .insert([{
        ticket_id,
        branch_id: branch.id,
        branch_name,
        completion_percentage: analysis.completion_percentage,
        status: analysis.status,
        completed_features: analysis.completed_features,
        in_progress: analysis.in_progress,
        pending_work: analysis.pending_work,
        code_quality: analysis.code_quality,
        overall_assessment: analysis.overall_assessment,
        recommendations: analysis.recommendations,
        total_commits_analyzed: commits.length,
        generated_by: ticket.developer || ticket.assignee
      }])
      .select();

    if (reportError) {
      console.error("Failed to save report:", reportError);
    }

    res.json({
      success: true,
      message: "Progress report generated successfully",
      ticket: {
        id: ticket.id,
        summary: ticket.summary,
        priority: ticket.priority,
        developer: ticket.developer
      },
      report: {
        ...analysis,
        metadata: {
          ticket_id,
          branch_name,
          commits_analyzed: commits.length,
          generated_at: new Date().toISOString(),
          report_id: reportData?.[0]?.id
        }
      }
    });

  } catch (error) {
    console.error("Progress Report Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all reports for a ticket
export const getTicketReports = async (req, res) => {
  try {
    const { ticket_id } = req.params;

    const { data, error } = await supabase
      .from("progress_reports")
      .select("*")
      .eq("ticket_id", ticket_id)
      .order("generated_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      ticket_id,
      total_reports: data.length,
      reports: data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};