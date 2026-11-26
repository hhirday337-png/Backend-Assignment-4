const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const appEmitter = require('../events/appEmitter');
const { verifyToken, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Every notes route requires a valid JWT
router.use(verifyToken);

// POST /api/notes - Create a note for the logged-in user
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'title and content are required' });
    }

    const note = await Note.create({
      title,
      content,
      owner: req.user.id,
    });

    appEmitter.emit('note:created', {
      noteId: note._id.toString(),
      title: note.title,
      owner: req.user.id,
    });

    return res.status(201).json(note);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create note', error: err.message });
  }
});

// GET /api/notes - Retrieve all notes belonging to the logged-in user
router.get('/', async (req, res) => {
  try {
    const notes = await Note.find({ owner: req.user.id }).sort({ createdAt: 1 });
    return res.status(200).json(notes);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch notes', error: err.message });
  }
});

// GET /api/notes/all - Admin-only route to view all notes across users (RBAC)
router.get('/all', authorizeRoles('admin'), async (req, res) => {
  try {
    const notes = await Note.find()
      .populate('owner', 'username email role')
      .sort({ createdAt: -1 });
    return res.status(200).json(notes);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch all notes', error: err.message });
  }
});

// GET /api/notes/:id - Retrieve a single note (owner or admin)
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json(note);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch note', error: err.message });
  }
});

// PUT /api/notes/:id - Update a note (owner or admin)
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, content } = req.body;
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;

    await note.save();

    appEmitter.emit('note:updated', {
      noteId: note._id.toString(),
      title: note.title,
      updatedBy: req.user.id,
    });

    return res.status(200).json(note);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update note', error: err.message });
  }
});

// DELETE /api/notes/:id - Delete a note (owner or admin)
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await note.deleteOne();

    appEmitter.emit('note:deleted', {
      noteId: note._id.toString(),
      deletedBy: req.user.id,
    });

    return res.status(200).json({ message: 'Note deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete note', error: err.message });
  }
});

module.exports = router;
