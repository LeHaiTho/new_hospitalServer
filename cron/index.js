const reminderCron = require("./reminderCron");
const {
  cancelExpiredAppointmentsCron,
  runOnceOnStartup,
} = require("./cancelExpiredAppointmentsCron");

const startCron = async () => {
  // Start existing reminder cron
  reminderCron();

  // Start new expired appointments cancellation cron
  cancelExpiredAppointmentsCron();

  // Run expired appointments check once on startup
  await runOnceOnStartup();

  console.log("All cron jobs started");
};

module.exports = { startCron };
