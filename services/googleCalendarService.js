// services/googleCalendarService.js
import { google } from "googleapis";
import supabase from "../config/supabaseClient.js";
import { authFromRefreshToken } from "../utils/googleOAuth.js";

const getColorForDate = (end_date) => {
  const today = new Date();
  const end = new Date(end_date);
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  if (diff > 7) return "10"; // green
  if (diff > 3) return "5";  // yellow
  return "11";               // red
};

export const createEventForUser = async ({ userId, ticket, silent = false }) => {
  // fetch refresh token
  const { data, error } = await supabase
    .from("user_google_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data || !data.refresh_token) {
    if (!silent) console.warn("No Google refresh token for user", userId);
    return null;
  }

  const refresh_token = data.refresh_token;
  const { oauth2Client } = await authFromRefreshToken(refresh_token);
  oauth2Client.setCredentials({ refresh_token });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const colorId = getColorForDate(ticket.end_date);

  const eventResource = {
    summary: ticket.summary || `Ticket #${ticket.id}`,
    description: ticket.description || "",
    start: { date: ticket.start_date }, // all-day event
    end: { date: ticket.end_date },
    colorId
  };

  const resp = await calendar.events.insert({
    calendarId: "primary",
    resource: eventResource
  });

  // store mapping
  await supabase.from("ticket_google_events").insert({
    ticket_id: ticket.id,
    user_id: userId,
    google_event_id: resp.data.id
  });

  return resp.data;
};

export const updateEventForTicket = async ({ ticket }) => {
  // find mappings
  const { data: rows } = await supabase
    .from("ticket_google_events")
    .select("*")
    .eq("ticket_id", ticket.id);

  for (const row of rows || []) {
    const { data: tokenRow } = await supabase
      .from("user_google_tokens")
      .select("refresh_token")
      .eq("user_id", row.user_id)
      .single();

    if (!tokenRow?.refresh_token) continue;

    const { oauth2Client } = await authFromRefreshToken(tokenRow.refresh_token);
    oauth2Client.setCredentials({ refresh_token: tokenRow.refresh_token });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const colorId = getColorForDate(ticket.end_date);

    // patch event start/end and color
    try {
      await calendar.events.patch({
        calendarId: "primary",
        eventId: row.google_event_id,
        resource: {
          start: { date: ticket.start_date },
          end: { date: ticket.end_date },
          colorId
        }
      });
    } catch (err) {
      console.warn("Failed to update event", row.google_event_id, err.message);
    }
  }
};


