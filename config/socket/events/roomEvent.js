module.exports = (io, socket) => {
  socket.on("join-room", (data) => {
    socket.join(data.roomId);
  });
};
