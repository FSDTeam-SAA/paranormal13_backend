export const sendResponse = (res, statusCode, message, payload) => {
  res.status(statusCode).json({
    success: true,
    message: message,
    data: payload,
  });
};