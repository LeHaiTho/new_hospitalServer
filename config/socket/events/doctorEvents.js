const doctorsOnline = new Map();

module.exports = (io, socket) => {
  if (socket.user.role === "doctor") {
    doctorsOnline.set(socket.user.id, socket.id);
  }

  socket.on("disconnect", () => {
    doctorsOnline.delete(socket.user.id);
  });

  socket.on("get-doctors", (callback) => {
    const doctorOnline = Array.from(doctorsOnline.keys());
    callback(doctorOnline);
  });
};
