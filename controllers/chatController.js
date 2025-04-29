import Message from '../models/messageModal.js';

export const getChatHistory = async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ],
      isDeleted: false
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'username')
    .populate('receiver', 'username');

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 