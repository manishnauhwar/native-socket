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
    .populate('sender', 'username fullName')
    .populate('receiver', 'username fullName');

    const transformedMessages = messages.map(message => ({
      ...message.toObject(),
      isSent: message.sender._id.toString() === userId
    }));

    res.status(200).json(transformedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 