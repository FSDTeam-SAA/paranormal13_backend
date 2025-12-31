import jwt from "jsonwebtoken";
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";

export default (io) => {
  // --- 1. MIDDLEWARE: SOCKET AUTHENTICATION ---
  io.use(async (socket, next) => {
    try {
      // FIX: Check Auth, Headers, AND Query Params
      let token =
        socket.handshake.auth?.token || 
        socket.handshake.headers?.authorization ||
        socket.handshake.query?.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      // Remove "Bearer " if present
      if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length).trim();
      }

      // Verify Token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Attach User ID to the socket instance
      socket.userId = decoded.id;
      
      next();
    } catch (err) {
      console.error("Socket Auth Error:", err.message);
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  // --- 2. CONNECTION HANDLER ---
  io.on("connection", (socket) => {
    console.log(`⚡ User Connected: ${socket.userId} (Socket ID: ${socket.id})`);

    socket.join(socket.userId);

    // --- HANDLE SEND MESSAGE ---
    socket.on("sendMessage", async (payload) => {
      try {
        const { recipientId, text, image } = payload;

        if (!recipientId) return socket.emit("messageError", { message: "Recipient ID required" });
        if (!text && !image) return socket.emit("messageError", { message: "Message cannot be empty" });

        // Save to Database
        let newMessage = await Message.create({
          sender: socket.userId,
          recipient: recipientId,
          text: text || "",
          image: image || null,
          isRead: false,
        });

        // Populate details
        newMessage = await newMessage.populate([
          { path: "sender", select: "name avatarUrl" },
          { path: "recipient", select: "name avatarUrl" },
        ]);

        // Emit to Recipient
        io.to(recipientId).emit("receiveMessage", newMessage);

        // Emit back to Sender
        socket.emit("messageSent", newMessage);

      } catch (error) {
        console.error("Socket Message Error:", error);
        socket.emit("messageError", { message: "Failed to send message" });
      }
    });

    // --- TYPING INDICATORS ---
    socket.on("typing", (recipientId) => {
      io.to(recipientId).emit("userTyping", { userId: socket.userId });
    });

    socket.on("stopTyping", (recipientId) => {
      io.to(recipientId).emit("userStopTyping", { userId: socket.userId });
    });

    socket.on("disconnect", () => {
      socket.leave(socket.userId);
    });
  });
};