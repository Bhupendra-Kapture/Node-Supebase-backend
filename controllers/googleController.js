// controllers/googleController.js
import { google } from "googleapis";
import supabase from "../config/supabaseClient.js";
import { createOAuth2Client } from "../utils/googleOAuth.js";
import { makeState, verifyState } from "../utils/jwtState.js";

export const generateAuthUrl = (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    const scopes = ["https://www.googleapis.com/auth/calendar.events"];
    // expect ?userId=... from frontend
    const userId = req.query.userId;
    const state = makeState({ userId });

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      prompt: "consent",
      state
    });

    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const googleCallback = async (req, res) => {
  try {
    const code = req.query.code;
    const stateToken = req.query.state;
    const verified = verifyState(stateToken);

    if (!verified || !verified.userId) {
      return res.status(400).send("Invalid or expired state");
    }
    const userId = verified.userId;

    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    // tokens.refresh_token will be present on first consent (or when prompt=consent)
    const refresh_token = tokens.refresh_token || null;

    // Upsert token into supabase
    const { error } = await supabase
      .from("user_google_tokens")
      .upsert(
        { user_id: userId, refresh_token, scope: tokens.scope || null },
        { onConflict: ["user_id"] }
      );

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({ error: error.message });
    }

    // Redirect back to frontend or respond JSON
    // Example: redirect to frontend dashboard
    res.send(`<html><body>Google connected. You can close this window.</body></html>`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
