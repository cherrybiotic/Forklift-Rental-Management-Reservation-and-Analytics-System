const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({ message: 'All fields required' });
    }
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const user = new User({ email, username, password, role: 'customer' });
    await user.save();
    
    res.status(201).json({ 
      message: 'Registration successful',
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }
    
    // Check if it's the owner account
    if (username === process.env.OWNER_USERNAME && password === process.env.OWNER_PASSWORD) {
      let owner = await User.findOne({ username: process.env.OWNER_USERNAME });
      
      if (!owner) {
        owner = new User({
          email: 'owner@redbrick.com',
          username: process.env.OWNER_USERNAME,
          password: process.env.OWNER_PASSWORD,
          role: 'owner'
        });
        await owner.save();
      }
      
      const token = jwt.sign(
        { userId: owner._id, role: owner.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      return res.json({
        message: 'Login successful',
        token,
        user: { id: owner._id, username: owner.username, role: owner.role }
      });
    }
    
    // Regular user login
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;