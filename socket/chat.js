module.exports = (io, socket) => {
  socket.on("sendMessage", (data) => {
    console.log("sendMessage", data);

    socket.on("send-message", (data) => {
      console.log("send-message", data);
    });
    socket.on("disconnect", () => {
      console.log("a user disconnected", socket.user.id);
    });
  });
};
