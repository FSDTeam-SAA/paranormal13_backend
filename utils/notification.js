import { messaging } from "../config/firebase.js";

/**
 * Send a notification to a specific device token
 * @param {string} token - FCM Device Token
 * @param {object} payload - Notification payload { title, body, data }
 */
export const sendNotification = async (token, { title, body, data = {} }) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel",
          sound: "default",
          priority: "high",
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: "default",
          },
        },
      },
      token,
    };

    const response = await messaging.send(message);

    if (response) {
      console.log("Successfully sent notification:", response);
    } else {
      console.log("Failed to send notification");
    }

    return response;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
};

/**
 * Send a notification to a specific topic
 * @param {string} topic - FCM Topic name
 * @param {object} payload - Notification payload { title, body, data }
 */
export const sendToTopic = async (topic, { title, body, data = {} }) => {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data,
      android: {
        priority: "high",
        notification: {
          channelId: "high_importance_channel",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: "default",
          },
        },
      },
      topic,
    };

    const response = await messaging.send(message);
    console.log("Successfully sent notification to topic:", response);
    return response;
  } catch (error) {
    console.error("Error sending topic notification:", error);
    throw error;
  }
};
