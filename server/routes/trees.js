import express from 'express';
import TreeCollaborator from '../models/Treecollaborator.js';
import User from '../models/User.js';
import Member from '../models/Member.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/trees — return all trees the logged-in user has access to
// Returns: [{ ownerId, ownerName, role, memberCount }]
router.get('/', protect, async (req, res) => {
  try {
    // My own tree
    const myCount = await Member.countDocuments({ userId: req.user.id });
    const me = await User.findById(req.user.id).select('name');
    const trees = [{
      ownerId:    req.user.id,
      ownerName:  me.name,
      role:       'owner',
      memberCount: myCount,
    }];

    // Trees I've been invited to
    const collabs = await TreeCollaborator.find({ userId: req.user.id })
      .populate('treeOwnerId', 'name');
    for (const c of collabs) {
      const count = await Member.countDocuments({ userId: c.treeOwnerId._id });
      trees.push({
        ownerId:    c.treeOwnerId._id,
        ownerName:  c.treeOwnerId.name,
        role:       c.role,
        memberCount: count,
      });
    }

    res.json(trees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;