export default (io) => {
  io.on("connection", (socket) => {
    // 1. Join Personal Room
    // When frontend connects, they must emit 'join' with their userId
    socket.on("join", (userId) => {
      if (userId) {
        socket.join(userId);
        console.log(`✅ User ${userId} joined their socket room`);
      }
    });

    // 2. Handle Disconnect
    socket.on("disconnect", () => {
      // Logic to handle user going offline can go here
    });
  });
};
