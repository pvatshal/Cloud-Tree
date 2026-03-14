import express from 'express';
import Member from '../models/Member.js';
import { protect } from '../middleware/authMiddleware.js';
import Notification from '../models/Notification.js';
import TreeCollaborator from '../models/TreeCollaborator.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  try {
    const { treeOwner } = req.query;
    if (treeOwner && treeOwner !== String(req.user.id)) {
      // Verify requester is a collaborator on that tree
      const collab = await TreeCollaborator.findOne({
        treeOwnerId: treeOwner,
        userId: req.user.id,
      });
      if (!collab) return res.status(403).json({ message: 'Access denied' });
    }
    const ownerId = treeOwner || req.user.id;
    const members = await Member.find({ userId: ownerId });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
// PUT /api/members/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const { $push_child, $push_parent, spouse, ...fields } = req.body;

    // ── $push_child: add a child to this member ──────────────────────────────
    if ($push_child) {
      const thisId = req.params.id;

      // Wire this member ↔ child
      await Member.findOneAndUpdate(
        { _id: thisId, userId: req.user.id },
        { $addToSet: { children: $push_child } }
      );
      await Member.findByIdAndUpdate($push_child, { $addToSet: { parents: thisId } });

      // Wire this member's spouse as co-parent (if they have one)
      const thisM = await Member.findById(thisId);
      if (thisM?.spouse) {
        await Member.findByIdAndUpdate(thisM.spouse, { $addToSet: { children: $push_child } });
        await Member.findByIdAndUpdate($push_child, { $addToSet: { parents: thisM.spouse } });
      }

      // KEY FIX: If the child already has another parent, auto-wire them as spouses
      const child = await Member.findById($push_child);
      const coParents = (child?.parents || [])
        .map(p => String(p))
        .filter(p => p !== String(thisId));

      if (coParents.length > 0 && !thisM?.spouse) {
        const coParentId = coParents[0]; // take the first existing parent
        const coParent = await Member.findById(coParentId);
        // Only wire if neither has a spouse yet
        if (!coParent?.spouse) {
          await Member.findByIdAndUpdate(thisId, { spouse: coParentId });
          await Member.findByIdAndUpdate(coParentId, { spouse: thisId });
        }
      }

      return res.json({ success: true });
    }

    // ── $push_parent: add a parent to this member ────────────────────────────
    if ($push_parent) {
      const thisId   = req.params.id;
      const parentId = $push_parent;

      // Wire parent ↔ this member
      await Member.findOneAndUpdate(
        { _id: thisId, userId: req.user.id },
        { $addToSet: { parents: parentId } }
      );
      await Member.findByIdAndUpdate(parentId, { $addToSet: { children: thisId } });

      // Wire parent's spouse as co-parent (if they have one)
      const parentM = await Member.findById(parentId);
      if (parentM?.spouse) {
        await Member.findByIdAndUpdate(parentM.spouse, { $addToSet: { children: thisId } });
        await Member.findByIdAndUpdate(thisId, { $addToSet: { parents: parentM.spouse } });
      }

      // KEY FIX: If this member already has another parent, auto-wire them as spouses
      const thisM = await Member.findById(thisId);
      const coParents = (thisM?.parents || [])
        .map(p => String(p))
        .filter(p => p !== String(parentId));

      if (coParents.length > 0 && !parentM?.spouse) {
        const coParentId = coParents[0];
        const coParent   = await Member.findById(coParentId);
        if (!coParent?.spouse) {
          await Member.findByIdAndUpdate(parentId,   { spouse: coParentId });
          await Member.findByIdAndUpdate(coParentId, { spouse: parentId });
        }
      }

      return res.json({ success: true });
    }

    // ── spouse: wire two members as married ──────────────────────────────────
    if (spouse !== undefined) {
      const member = await Member.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { spouse },
        { new: true }
      );
      if (!member) return res.status(404).json({ message: 'Member not found' });

      if (spouse) {
        // Wire back
        await Member.findByIdAndUpdate(spouse, { spouse: req.params.id });

        // Cross-wire children: each spouse inherits the other's children
        const spouseDoc = await Member.findById(spouse);
        if (spouseDoc?.children?.length) {
          await Member.findByIdAndUpdate(req.params.id, {
            $addToSet: { children: { $each: spouseDoc.children.map(String) } },
          });
          await Member.updateMany(
            { _id: { $in: spouseDoc.children } },
            { $addToSet: { parents: req.params.id } }
          );
        }
        if (member.children?.length) {
          await Member.findByIdAndUpdate(spouse, {
            $addToSet: { children: { $each: member.children.map(String) } },
          });
          await Member.updateMany(
            { _id: { $in: member.children } },
            { $addToSet: { parents: spouse } }
          );
        }
      }

      return res.json(member);
    }

    // ── Regular field update (name, dob, photo, notes, etc.) ─────────────────
    const member = await Member.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      fields,
      { new: true }
    );
    if (!member) return res.status(404).json({ message: 'Member not found' });

    await Notification.create({
      user:     req.user.id,
      type:     'member_edited',
      message:  `${member.name}'s details were updated.`,
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