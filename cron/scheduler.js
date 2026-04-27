import { Queue, Worker } from "bullmq";
import { medicineQueue } from "../queues/medicineQueue.js";
import MedicinePlan from "../models/medicinePlanModel.js";
import redisConnection from "../config/redis.js";

const isSameDay = (d1, d2) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const getDaysDiff = (start, current) => {
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const c = new Date(current);
  c.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(c - s);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Formats current time to "hh:mm am/pm" to match database strings
 */
const getCurrentTimeFormatted = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
  return strTime.toLowerCase(); // Ensure lowercase
};

export const schedulerQueue = new Queue("medicine-scheduler", {
  connection: redisConnection,
});

export const startScheduler = async () => {
  console.log("⏰ Initializing Medicine Scheduler...");

  // 1. Clear existing repeatable jobs
  const repeatableJobs = await schedulerQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await schedulerQueue.removeRepeatableByKey(job.key);
  }

  // 2. Schedule the main check to run every minute
  await schedulerQueue.add(
    "check-medicines",
    {},
    {
      repeat: {
        pattern: "* * * * *", // Every minute
      },
    }
  );

  console.log("✅ Medicine Scheduler running every minute");
};

// This is the actual logic that runs inside the scheduler job

export const startSchedulerWorker = () => {
  new Worker(
    "medicine-scheduler",
    async (job) => {
      if (job.name === "check-medicines") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentDayOfWeek = today.getDay();
        const currentTime = getCurrentTimeFormatted();

        console.log(`-------------------------------------------`);
        console.log(`🔍 CRON CHECK [${new Date().toISOString()}]`);
        console.log(`🔍 Formatted Current Time: "${currentTime}"`);
        console.log(`🔍 Day of week: ${currentDayOfWeek}`);

        // Find all active plans
        // We fetch all active plans and filter dates in JS to avoid UTC/timezone confusion
        const allPlans = await MedicinePlan.find({ isActive: true });

        console.log(`🔍 Found ${allPlans.length} active medicine plans in DB.`);

        for (const plan of allPlans) {
          // 0. Date Validation (JS-side to handle local timezones)
          const planStart = new Date(plan.startDate);
          planStart.setHours(0, 0, 0, 0);
          const planEnd = plan.endDate ? new Date(plan.endDate) : null;
          if (planEnd) planEnd.setHours(0, 0, 0, 0);

          if (planStart > today) continue; // Not started yet
          if (planEnd && planEnd < today) continue; // Already ended

          let shouldTakeToday = false;

          // A. Daily
          if (plan.frequency === "daily") shouldTakeToday = true;

          // B. Specific Days
          if (plan.frequency === "specific_days") {
            shouldTakeToday = plan.specificDays && plan.specificDays.includes(currentDayOfWeek);
          }

          // C. Interval
          if (plan.frequency === "interval") {
            const start = new Date(plan.startDate);
            if (isSameDay(start, today)) {
              shouldTakeToday = true;
            } else {
              const diff = getDaysDiff(start, today);
              shouldTakeToday = diff % plan.interval === 0;
            }
          }

          if (shouldTakeToday) {
            const normalizedTimes = plan.timesOfDay.map(t => t.toLowerCase());
            console.log(`   - Plan "${plan.name}" is scheduled for today. Checking times: [${normalizedTimes.join(", ")}]`);
            
            // Check if current time matches any of the timesOfDay
            if (normalizedTimes.includes(currentTime)) {
              console.log(`🚀 MATCH! Scheduling notification for ${plan.name} at ${currentTime}`);

              // Add a job to the SAME queue but with a different name to be handled by the medicineWorker
              await medicineQueue.add("send-notification", {
                patientId: plan.patient,
                medicineName: plan.name,
                dosage: plan.dosage,
                time: currentTime,
              });
            }
          }
        }
      }
    },
    { connection: redisConnection }
  );
};
