import { Queue } from "bullmq";
import redisConnection from "../config/redis.js";

export const medicineQueue = new Queue("medicine-notifications", {
  connection: redisConnection,
});
