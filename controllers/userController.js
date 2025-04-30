import User from '../models/userModal.js';
import Message from '../models/messageModal.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

export const registerUser = async (req, res) => {
    try {
      const { username, fullName, email, password, confirmPassword } = req.body;
  
      if (!username || !fullName || !email || !password || !confirmPassword) {
        return res.status(400).json({ message: 'All fields are required' });
      }
  
      if (password !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }
  
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with given email or username' });
      }
  
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
  
      // Create user
      const user = await User.create({
        username,
        fullName,
        email,
        password: hashedPassword
      });
  
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email
        }
      });
  
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
};

export const loginUser = async (req, res) => {
  try {
    const { username_or_email, password } = req.body;

    if (!username_or_email || !password) {
      return res.status(400).json({ message: 'Please provide email/username and password' });
    }

    const user = await User.findOne({ 
      $or: [
        { email: username_or_email },
        { username: username_or_email }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, 'username fullName email');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUnreadCounts = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          receiver: mongoose.Types.ObjectId(userId),
          isRead: false,
          isDeletedForEveryone: false,
          deletedFor: { $ne: mongoose.Types.ObjectId(userId) }
        }
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = {};
    unreadCounts.forEach(item => {
      counts[item._id.toString()] = item.count;
    });

    res.status(200).json(counts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
