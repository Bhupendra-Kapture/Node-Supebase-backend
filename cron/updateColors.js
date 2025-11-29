// cron/updateColors.js
import cron from "node-cron";
import supabase from "../config/supabaseClient.js";
import { updateEventForTicket } from "../services/googleCalendarService.js";

export const startDailyColorUpdate = () => {
  // every day at 07:00
  cron.schedule("0 7 * * *", async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data: tickets } = await supabase
        .from("tickets")
        .select("*")
        .gte("end_date", today);

      for (const t of tickets || []) {
        await updateEventForTicket({ ticket: t });
      }
    } catch (err) {
      console.error("cron error", err.message);
    }
  });
};
