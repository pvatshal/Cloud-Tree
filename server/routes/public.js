import express from 'express';
import Share from '../models/Share.js';
import Member from '../models/Member.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/public/:token — returns tree data for a valid share token (no auth)
router.get('/:token', async (req, res) => {
  try {
    const share = await Share.findOne({ token: req.params.token, active: true });
    if (!share) return res.status(404).json({ message: 'Link not found or revoked' });

    const members = await Member.find({ userId: share.userId });
    const user    = await User.findById(share.userId).select('name');
    res.json({ members, ownerName: user?.name || 'Someone' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;