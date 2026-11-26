const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const appEmitter = require('../events/appEmitter');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email, and password are required' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { username: username.trim() }],
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Username or email already exists' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';
    const user = await User.create({
      username,
      email,
      password,
      role: assignedRole,
    });

    appEmitter.emit('user:signup', {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    });

    return res.status(201).json({
      message: 'User registered',
      id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const payload = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    });

    // Also set HttpOnly cookie so clients using cookie auth work seamlessly
    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    appEmitter.emit('user:login', {
      id: payload.id,
      username: payload.username,
      email: payload.email,
    });

    return res.status(200).json({
      message: 'Login successful',
      token,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// GET /api/auth/me (protected)
router.get('/me', verifyToken, (req, res) => {
  return res.status(200).json({ user: req.user });
});

module.exports = router;
