// import express from 'express';
// import Member from '../models/Member.js';
// import { protect } from '../middleware/authMiddleware.js';

// const router = express.Router();

// router.get('/', protect, async (req, res) => {
//   try {
//     const members = await Member.find({ userId: req.user.id });
//     res.json(members);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// router.post('/', protect, async (req, res) => {
//   try {
//     const member = await Member.create({ ...req.body, userId: req.user.id });
//     res.status(201).json(member);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// router.put('/:id', protect, async (req, res) => {
//   try {
//     const { $push_child, $push_parent, ...rest } = req.body;
//     let update = { ...rest };

//     if ($push_child) update = { ...update, $push: { children: $push_child } };
//     if ($push_parent) update = { ...update, $push: { parents: $push_parent } };

//     const member = await Member.findByIdAndUpdate(req.params.id, update, { new: true });
//     res.json(member);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// router.delete('/:id', protect, async (req, res) => {
//   try {
//     const member = await Member.findById(req.params.id);
//     // Clean up all references to this member
//     await Member.updateMany(
//       { $or: [{ children: req.params.id }, { parents: req.params.id }, { spouse: req.params.id }] },
//       { $pull: { children: req.params.id, parents: req.params.id }, $unset: { spouse: '' } }
//     );
//     await Member.findByIdAndDelete(req.params.id);
//     res.json({ message: 'Member deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

// export default router;

import express from 'express';
import Member from '../models/Member.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const members = await Member.find({ userId: req.user.id });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, async (req, res) => {
  try {
    const member = await Member.create({ ...req.body, userId: req.user.id });
    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', protect, async (req, res) => {
  try {
    const { $push_child, $push_parent, ...rest } = req.body;
    let update = { ...rest };

    if ($push_child) update = { ...update, $push: { children: $push_child } };
    if ($push_parent) update = { ...update, $push: { parents: $push_parent } };

    const member = await Member.findByIdAndUpdate(req.params.id, update, { new: true });

    // ── Smart Inference ──────────────────────────────────────────
    // If we just set a spouse, wire up children automatically
    if (rest.spouse) {
      const spouseId = rest.spouse;
      const currentId = req.params.id;

      // Get both members fresh
      const [current, spouse] = await Promise.all([
        Member.findById(currentId),
        Member.findById(spouseId),
      ]);

      // Collect all children from both sides
      const currentChildren = (current?.children || []).map(String);
      const spouseChildren  = (spouse?.children  || []).map(String);
      const allChildren = [...new Set([...currentChildren, ...spouseChildren])];

      if (allChildren.length) {
        // Add current member as parent to all spouse's children (if not already)
        for (const childId of spouseChildren) {
          if (!currentChildren.includes(childId)) {
            await Member.findByIdAndUpdate(currentId, { $addToSet: { children: childId } });
            await Member.findByIdAndUpdate(childId,   { $addToSet: { parents:  currentId } });
          }
        }

        // Add spouse as parent to all current member's children (if not already)
        for (const childId of currentChildren) {
          if (!spouseChildren.includes(childId)) {
            await Member.findByIdAndUpdate(spouseId, { $addToSet: { children: childId } });
            await Member.findByIdAndUpdate(childId,  { $addToSet: { parents:  spouseId } });
          }
        }
      }
    }

    // If we just added a child, also add current member as
    // co-parent alongside their spouse (if any)
    if ($push_child) {
      const parent = await Member.findById(req.params.id);
      if (parent?.spouse) {
        const spouseId = String(parent.spouse);
        const childId  = String($push_child);
        await Member.findByIdAndUpdate(spouseId, { $addToSet: { children: childId } });
        await Member.findByIdAndUpdate(childId,  { $addToSet: { parents:  spouseId } });
      }
    }
    // ── End Inference ────────────────────────────────────────────

    res.json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', protect, async (req, res) => {
  try {
    await Member.updateMany(
      { $or: [{ children: req.params.id }, { parents: req.params.id }, { spouse: req.params.id }] },
      { $pull: { children: req.params.id, parents: req.params.id }, $unset: { spouse: '' } }
    );
    await Member.findByIdAndDelete(req.params.id);
    res.json({ message: 'Member deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;