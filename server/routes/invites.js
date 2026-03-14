import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import TreeInvite from '../models/TreeInvite.js';
import TreeCollaborator from '../models/TreeCollaborator.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
const sns = new SNSClient({ region: process.env.SES_REGION || 'us-east-2' });

// POST /api/invites — send invite
router.post('/', protect, async (req, res) => {
  try {
    const { email, role = 'viewer' } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const owner = await User.findById(req.user.id).select('name');

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      const alreadyCollab = await TreeCollaborator.findOne({
        treeOwnerId: req.user.id, userId: existing._id,
      });
      if (alreadyCollab) return res.status(400).json({ message: 'This person is already a collaborator' });
    }

    await TreeInvite.deleteMany({ treeOwnerId: req.user.id, inviteeEmail: email.toLowerCase(), status: 'pending' });

    const invite = await TreeInvite.create({
      treeOwnerId:  req.user.id,
      inviteeEmail: email.toLowerCase(),
      role,
      token: uuidv4(),
    });

    await sns.send(new PublishCommand({
      TopicArn: process.env.SNS_INVITE_TOPIC,
      Message: JSON.stringify({
        ownerName:    owner.name,
        inviteeEmail: email.toLowerCase(),
        role,
        token:        invite.token,
        appUrl:       process.env.APP_URL,
      }),
    }));

    res.json({ success: true, invite: { id: invite._id, email, role, status: 'pending' } });
  } catch (err) {
    console.error('Invite error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/invites/my
router.get('/my', protect, async (req, res) => {
  try {
    const invites = await TreeInvite.find({ treeOwnerId: req.user.id }).sort('-createdAt');
    res.json(invites);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/invites/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await TreeInvite.deleteOne({ _id: req.params.id, treeOwnerId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/invites/accept/:token
router.get('/accept/:token', protect, async (req, res) => {
  try {
    const invite = await TreeInvite.findOne({ token: req.params.token, status: 'pending' });
    if (!invite) return res.status(404).json({ message: 'Invite not found or already used' });

    const user = await User.findById(req.user.id).select('email');
    if (user.email.toLowerCase() !== invite.inviteeEmail) {
      return res.status(403).json({ message: `This invite was sent to ${invite.inviteeEmail}` });
    }

    await TreeCollaborator.findOneAndUpdate(
      { treeOwnerId: invite.treeOwnerId, userId: req.user.id },
      { role: invite.role },
      { upsert: true, new: true }
    );

    invite.status = 'accepted';
    await invite.save();

    res.json({ success: true, treeOwnerId: invite.treeOwnerId, role: invite.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
