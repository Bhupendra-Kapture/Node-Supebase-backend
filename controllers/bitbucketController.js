import axios from "axios";
import supabase from "../config/supabaseClient.js";

export const createBitbucketBranch = async (req, res) => {
  try {
    const { ticket_id, workspace, repo_slug, branch_name, base_branch, created_by } = req.body;

    // Validation
    if (!workspace || !repo_slug || !branch_name || !base_branch || !ticket_id) {
      return res.status(400).json({ 
        error: "Missing required fields.",
        required: ["ticket_id", "workspace", "repo_slug", "branch_name", "base_branch"]
      });
    }

    const apiToken = process.env.BITBUCKET_API_TOKEN;

    if (!apiToken) {
      return res.status(500).json({ 
        error: "Bitbucket credentials not configured on server" 
      });
    }

    // Use Bearer token instead of Basic Auth
    const headers = {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    };

    // Step 1: Get the commit hash of the base branch
    const branchUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}/refs/branches/${base_branch}`;
    
    let commitHash;
    try {
      const branchResponse = await axios.get(branchUrl, { headers });
      commitHash = branchResponse.data.target.hash;
      console.log(`Base branch '${base_branch}' commit hash: ${commitHash}`);
    } catch (err) {
      if (err.response?.status === 404) {
        return res.status(404).json({ 
          error: `Base branch '${base_branch}' not found in repository` 
        });
      }
      throw err;
    }

    // Step 2: Create the new branch
    const createUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repo_slug}/refs/branches`;

    let branchResponse;
    try {
      branchResponse = await axios.post(
        createUrl,
        {
          name: branch_name,
          target: { hash: commitHash }
        },
        { headers }
      );
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error?.message?.includes("already exists")) {
        return res.status(409).json({ 
          error: `Branch '${branch_name}' already exists`,
          suggestion: "Use a different branch name or delete the existing branch"
        });
      }
      throw err;
    }

    const createdBranchUrl = branchResponse.data.links?.html?.href || null;
    
    // Step 3: Save branch info in Supabase
    const { data: branchData, error: branchError } = await supabase
      .from("ticket_branches")
      .insert([
        {
          ticket_id,
          branch_name,
          repo_slug,
          workspace,
          commit_hash: commitHash,
          created_by: created_by || null,
          branch_url: createdBranchUrl
        }
      ])
      .select();

    // Handle Supabase error but still return success for Bitbucket
    if (branchError) {
      console.error("Supabase Insert Error:", branchError.message);
      return res.status(207).json({
        success: true,
        warning: "Branch created in Bitbucket but failed to log in database",
        bitbucket: {
          branch_name,
          branch_url: createdBranchUrl,
          commit_hash: commitHash
        },
        database_error: branchError.message
      });
    }

    // Step 4: Full success response
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

    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    }

    const statusCode = err.response?.status || 500;
    
    res.status(statusCode).json({
      success: false,
      error: err.response?.data?.error?.message || err.message,
      details: err.response?.data || null
    });
  }
};