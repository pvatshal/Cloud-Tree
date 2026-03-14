import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  treeOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:        { type: String, enum: ['editor', 'viewer'], default: 'viewer' },
}, { timestamps: true });

schema.index({ treeOwnerId: 1, userId: 1 }, { unique: true });

export default mongoose.model('TreeCollaborator', schema);