import { Worker } from "bullmq";
import redisConnection from "../config/redis.js";
import { sendNotification } from "../utils/notification.js";
import User from "../models/userModel.js";

export const startMedicineWorker = () => {
  const worker = new Worker(
    "medicine-notifications",
    async (job) => {
      if (job.name !== "send-notification") return;

      const { patientId, medicineName, dosage, time } = job.data;

      try {
        const user = await User.findById(patientId);
        if (!user || !user.fcmToken) {
          console.log(`⚠️ User ${patientId} not found or has no FCM token. Skipping.`);
          return;
        }

        await sendNotification(user.fcmToken, {
          title: "Medicine Reminder",
          body: `It's time to take ${dosage} of ${medicineName}.`,
          data: {
            type: "MEDICINE_REMINDER",
            medicineName,
            time,
          },
        });

        console.log(`✅ Notification sent for ${medicineName} to user ${user.name}`);
      } catch (error) {
        console.error(`❌ Error in medicine worker for job ${job.id}:`, error);
        throw error;
      }
    },
    { connection: redisConnection }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed!`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job.id} failed with ${err.message}`);
  });

  console.log("👷 Medicine Worker is running...");
};
