const sequelize = require("../config/database");
const { Message, ChatRoom } = require("../models");

const getMessages = async (req, res) => {
  const { roomId } = req.params;
  try {
    const room = await ChatRoom.findByPk(roomId);

    const messages = await Message.findAll({
      where: { room_id: room.id },
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ messages });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { getMessages };
