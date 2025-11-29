// utils/googleOAuth.js
import { google } from "googleapis";

export const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

/**
 * Given a refresh_token, returns an oauth2Client with fresh access token
 * and the oauth2Client instance.
 */
export const authFromRefreshToken = async (refresh_token) => {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token });

  // Get a fresh access token — googleapis exposes getAccessToken()
  const accessTokenResponse = await oauth2Client.getAccessToken();
  const access_token = accessTokenResponse?.token || null;

  return { oauth2Client, access_token };
};
