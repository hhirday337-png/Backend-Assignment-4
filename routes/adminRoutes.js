const express = require('express');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/admin/users - Admin-only endpoint demonstrating RBAC
router.get('/users', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
});

module.exports = router;
