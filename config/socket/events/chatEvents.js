const { where } = require("sequelize");
const { ChatRoom, Message } = require("../../../models");

module.exports = (io, socket) => {
  socket.on("send-message", async (data) => {
    const { roomId, message } = data;
    const room = await ChatRoom.findOne({ where: { room_id: roomId } });
    const newMessage = await Message.create({
      room_id: room.id,
      sender_id: socket.user.id,
      content: message,
    });
    io.to(roomId).emit("receive-message", newMessage);
  });
};
