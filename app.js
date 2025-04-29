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
        content: message
      });

      const receiverSocket = onlineUsers.get(to);
      if (receiverSocket) {
        io.to(receiverSocket).emit('private_message', {
          message: newMessage,
          from: from
        });
      }

      socket.emit('private_message', {
        message: newMessage,
        to: to
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  socket.on('delete_message', async ({ messageId, userId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      if (message.sender.toString() === userId || message.receiver.toString() === userId) {
        message.isDeleted = true;
        await message.save();

        const senderSocket = onlineUsers.get(message.sender.toString());
        const receiverSocket = onlineUsers.get(message.receiver.toString());

        if (senderSocket) {
          io.to(senderSocket).emit('message_deleted', { messageId });
        }
        if (receiverSocket) {
          io.to(receiverSocket).emit('message_deleted', { messageId });
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Error deleting message' });
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
