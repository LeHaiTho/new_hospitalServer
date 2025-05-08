const { Server } = require("socket.io");
const socketAuth = require("../../middlewares/socketAuthMiddleware");
const doctorEvents = require("./events/doctorEvents");
const chatEvents = require("./events/chatEvents");
const roomEvents = require("./events/roomEvent");
module.exports = (server, secretKey) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.use(socketAuth(secretKey));

  io.on("connection", (socket) => {
    console.log("a user connected", socket.user.id, socket.user.role);

    chatEvents(io, socket);
    doctorEvents(io, socket);
    roomEvents(io, socket);

    socket.on("disconnect", () => {
      console.log("a user disconnected", socket.user.id);
    });
  });

  return io;
};
