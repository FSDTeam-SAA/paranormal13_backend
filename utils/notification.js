import { messaging } from "../config/firebase.js";

/**
 * Send a notification to a specific device token
 * @param {string} token - FCM Device Token
 * @param {object} payload - Notification payload { title, body, data }
 */
export const sendNotification = async (token, { title, body, data = {} }) => {
  try {
    const isCall = data.type === "CALL" || data.type === "EMERGENCY" || data.type === "panic";

    const message = {
      // If it's a call, we OMIT the notification block to avoid a standard push banner
      // and let the Flutter background handler show the CallKit UI instead.
      ...(isCall ? {} : {
        notification: {
          title,
          body,
        }
      }),
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
        title: title, // Put in data for CallKit to use
        body: body,
      },
      android: {
        priority: "high",
        notification: {
          channelId: isCall ? "high_importance_channel" : "default_channel",
          sound: isCall ? "alarm" : "default",
          priority: "high",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: isCall ? "alarm.caf" : "default",
            priority: 10,
          },
        },
        headers: {
          "apns-priority": "10",
          "apns-push-type": isCall ? "background" : "alert", // Use background for data-only
        },
      },
      token,
    };

    const response = await messaging.send(message);

    if (response) {
      console.log(`Successfully sent ${data.type || 'standard'} notification:`, response);
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
