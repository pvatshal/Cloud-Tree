import express from 'express';
import Member from '../models/Member.js';
import { protect } from '../middleware/authMiddleware.js';
import Notification from '../models/Notification.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const members = await Member.find({ userId: req.user.id });
  res.json(members);
});
// POST — add member
router.post('/', protect, async (req, res) => {
  try {
    const { name, gender, dob, anniversary, email, phone, notes, photo, parents, children, spouse } = req.body;
    
    const member = await Member.create({
      userId: req.user.id, name, gender, dob, anniversary, email, phone, notes, photo,
      parents: parents || [], children: children || [], spouse: spouse || null,
    });

    // Wire children → update their parents array to include new member
    if (children?.length) {
      await Member.updateMany(
        { _id: { $in: children } },
        { $addToSet: { parents: member._id } }
      );
    }

    // Wire parents → update their children array to include new member
    if (parents?.length) {
      await Member.updateMany(
        { _id: { $in: parents } },
        { $addToSet: { children: member._id } }
      );
      // Also wire parent's spouse as co-parent
      const parentDocs = await Member.find({ _id: { $in: parents } });
      for (const p of parentDocs) {
        if (p.spouse) {
          await Member.findByIdAndUpdate(p.spouse, { $addToSet: { children: member._id } });
          await Member.findByIdAndUpdate(member._id, { $addToSet: { parents: p.spouse } });
        }
      }
    }

    // Wire spouse
    if (spouse) {
      await Member.findByIdAndUpdate(spouse, { spouse: member._id });
      const spouseDoc = await Member.findById(spouse);
      if (spouseDoc?.children?.length) {
        await Member.findByIdAndUpdate(member._id, { $addToSet: { children: { $each: spouseDoc.children } } });
        await Member.updateMany({ _id: { $in: spouseDoc.children } }, { $addToSet: { parents: member._id } });
      }
      if (children?.length) {
        await Member.findByIdAndUpdate(spouse, { $addToSet: { children: { $each: children } } });
        await Member.updateMany({ _id: { $in: children } }, { $addToSet: { parents: spouse } });
      }
    }

    // Notification
    await Notification.create({
      user: req.user.id,
      type: 'member_added',
      message: `${name} was added to your family tree.`,
      memberId: member._id,
    });

    res.status(201).json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// PUT — edit member
router.put('/:id', protect, async (req, res) => {
  try {
    const member = await Member.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );
    if (!member) return res.status(404).json({ message: 'Member not found' });

    // 🔔 Notification
    await Notification.create({
      user: req.user.id,
      type: 'member_edited',
      message: `${member.name}'s details were updated.`,
      memberId: member._id,
    });

    res.json(member);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE — remove member
router.delete('/:id', protect, async (req, res) => {
  try {
    const member = await Member.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    await Member.updateMany({ children: req.params.id }, { $pull: { children: req.params.id } });
    await Member.updateMany({ parents:  req.params.id }, { $pull: { parents:  req.params.id } });
    await Member.updateMany({ spouse:   req.params.id }, { $set:  { spouse:   null } });

    // 🔔 Notification
    await Notification.create({
      user: req.user.id,
      type: 'member_deleted',
      message: `${member.name} was removed from your family tree.`,
    });

    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
export default router;