import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "preorder_round_close_and_shipping_reminders",
  { hourUTC: 23, minuteUTC: 59 },
  internal.preorderRounds.runDailyCloseAndReminders,
);

export default crons;
