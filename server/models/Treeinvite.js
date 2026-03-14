import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const schema = new mongoose.Schema({
  treeOwnerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteeEmail:  { type: String, required: true, lowercase: true, trim: true },
  role:          { type: String, enum: ['editor', 'viewer'], default: 'viewer' },
  token:         { type: String, default: uuidv4, unique: true },
  status:        { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending' },
}, { timestamps: true });

export default mongoose.model('TreeInvite', schema);