import Message from '../models/messageModal.js';

export const getChatHistory = async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ],
      isDeletedForEveryone: false
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'username fullName')
    .populate('receiver', 'username fullName');

    const transformedMessages = messages
      .filter(message => !message.deletedFor.includes(userId))
      .map(message => ({
        ...message.toObject(),
        isSent: message.sender._id.toString() === userId
      }));

    res.status(200).json(transformedMessages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId, userId, deleteForEveryone } = req.body;
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (deleteForEveryone && message.sender.toString() === userId) {
      message.isDeletedForEveryone = true;
      await message.save();
    } else {
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }
    }

    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const clearChat = async (req, res) => {
  try {
    const { userId, otherUserId } = req.body;
    
    await Message.updateMany(
      {
        $or: [
          { sender: userId, receiver: otherUserId },
          { sender: otherUserId, receiver: userId }
        ]
      },
      { $addToSet: { deletedFor: userId } }
    );

    res.status(200).json({ message: 'Chat cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 