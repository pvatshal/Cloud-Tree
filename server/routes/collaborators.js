import express from 'express';
import Treecollaborator from '../models/Treecollaborator.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/collaborators — list collaborators on MY tree
router.get('/', protect, async (req, res) => {
  try {
    const collabs = await TreeCollaborator.find({ treeOwnerId: req.user.id })
      .populate('userId', 'name email')
      .sort('-createdAt');
    res.json(collabs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/collaborators/:userId — remove a collaborator from my tree
router.delete('/:userId', protect, async (req, res) => {
  try {
    await TreeCollaborator.deleteOne({ treeOwnerId: req.user.id, userId: req.params.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;