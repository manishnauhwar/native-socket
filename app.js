import express from 'express';
import dotenv from 'dotenv';
import connectDB from './configs/ConnectDb.js'; 
import { createServer } from 'http';
import { Server } from 'socket.io';
import userRouter from './routes/userRouter.js';
import cors from 'cors';
import Message from './models/messageModal.js';

dotenv.config();
const app = express();

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());  
app.use('/api/users', userRouter);

const onlineUsers = new Map(); 

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join', (userId) => {
    onlineUsers.set(userId, socket.id);
    socket.join(userId);
    io.emit('online_users', Array.from(onlineUsers.keys()));
  });

  socket.on('private_message', async ({ to, from, message }) => {
    try {
      const newMessage = await Message.create({
        sender: from,
        receiver: to,
        content: message,
        isRead: false
      });

      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'username fullName')
        .populate('receiver', 'username fullName');

      const senderSocket = onlineUsers.get(from);
      const receiverSocket = onlineUsers.get(to);

      if (senderSocket) {
        io.to(senderSocket).emit('private_message', { 
          message: {
            ...populatedMessage.toObject(),
            isSent: true
          }
        });
      }

      if (receiverSocket) {
        io.to(receiverSocket).emit('private_message', { 
          message: {
            ...populatedMessage.toObject(),
            isSent: false
          }
        });
        io.to(receiverSocket).emit('message_received');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('mark_messages_read', async ({ from, to }) => {
    try {
      await Message.updateMany(
        {
          sender: from,
          receiver: to,
          isRead: false
        },
        { isRead: true }
      );

      const senderSocket = onlineUsers.get(from);
      if (senderSocket) {
        io.to(senderSocket).emit('message_read');
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });

  socket.on('delete_message', async ({ messageId, userId, deleteForEveryone }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      if (deleteForEveryone && message.sender.toString() === userId) {
        message.isDeletedForEveryone = true;
        await message.save();

        const senderSocket = onlineUsers.get(message.sender.toString());
        const receiverSocket = onlineUsers.get(message.receiver.toString());

        if (senderSocket) {
          io.to(senderSocket).emit('message_deleted', { messageId, deleteForEveryone });
        }
        if (receiverSocket) {
          io.to(receiverSocket).emit('message_deleted', { messageId, deleteForEveryone });
        }
      } else {
        if (!message.deletedFor.includes(userId)) {
          message.deletedFor.push(userId);
          await message.save();
          socket.emit('message_deleted', { messageId, deleteForEveryone: false });
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Error deleting message' });
    }
  });

  socket.on('clear_chat', async ({ userId, otherUserId }) => {
    try {
      await Message.updateMany(
        {
          $or: [
            { sender: userId, receiver: otherUserId },
            { sender: otherUserId, receiver: userId }
          ]
        },
        { $addToSet: { deletedFor: userId } }
      );

      socket.emit('chat_cleared', { userId, otherUserId });
    } catch (error) {
      console.error('Error clearing chat:', error);
      socket.emit('error', { message: 'Error clearing chat' });
    }
  });

  socket.on('disconnect', () => {
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        io.emit('online_users', Array.from(onlineUsers.keys()));
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, async () => {
  try {
    await connectDB();
    console.log(`Server is running on port ${PORT}`);
  } catch (error) {
    console.error('Error starting server:', error);
  }
});
