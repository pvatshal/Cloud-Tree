import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const shareSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token:  { type: String, default: uuidv4, unique: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('Share', shareSchema);