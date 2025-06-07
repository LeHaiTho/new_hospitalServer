const cron = require("node-cron");
const moment = require("moment-timezone");
const Appointment = require("../models/appointmentModel");
const { Op } = require("sequelize");

const cancelExpiredAppointments = async () => {
  try {
    console.log("Checking for expired appointments...");

    // Get current date in Vietnam timezone
    const currentDate = moment().tz("Asia/Bangkok").startOf("day");

    // Find appointments that are expired (appointment_date is before today)
    // and have status: confirmed, pending, or updated
    const expiredAppointments = await Appointment.findAll({
      where: {
        appointment_date: {
          [Op.lt]: currentDate.toDate(),
        },
        status: {
          [Op.in]: ["confirmed", "pending", "updated"],
        },
        isDeleted: false,
      },
    });

    if (expiredAppointments.length > 0) {
      // Update expired appointments to 'cancelled' status
      const updateResult = await Appointment.update(
        { status: "cancelled" },
        {
          where: {
            appointment_date: {
              [Op.lt]: currentDate.toDate(),
            },
            status: {
              [Op.in]: ["confirmed", "pending", "updated"],
            },
            isDeleted: false,
          },
        }
      );

      console.log(
        `Updated ${updateResult[0]} expired appointments to cancelled status`
      );
      console.log(`Expired appointments found: ${expiredAppointments.length}`);
    } else {
      console.log("No expired appointments found to cancel");
    }
  } catch (error) {
    console.error("Error in cancelExpiredAppointments:", error);
  }
};

// Run once when server starts
const runOnceOnStartup = async () => {
  console.log("Running expired appointments check on server startup...");
  await cancelExpiredAppointments();
};

// Schedule to run every day at midnight (00:00)
const cancelExpiredAppointmentsCron = () => {
  // Run at midnight every day
  cron.schedule("0 0 * * *", async () => {
    console.log(
      "Daily expired appointments check started at:",
      moment().tz("Asia/Bangkok").format("YYYY-MM-DD HH:mm:ss")
    );
    await cancelExpiredAppointments();
  });
};

module.exports = {
  cancelExpiredAppointmentsCron,
  runOnceOnStartup,
};
