import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Share from '../models/Share.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/share — generate or return existing active link
router.post('/', protect, async (req, res) => {
  try {
    // Revoke any existing links first
    await Share.deleteMany({ userId: req.user.id });
    const share = await Share.create({ userId: req.user.id, token: uuidv4(), active: true });
    res.json({ token: share.token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/share/my — get my current active link (if any)
router.get('/my', protect, async (req, res) => {
  try {
    const share = await Share.findOne({ userId: req.user.id, active: true });
    res.json({ token: share?.token || null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/share — revoke all my links
router.delete('/', protect, async (req, res) => {
  try {
    await Share.deleteMany({ userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;