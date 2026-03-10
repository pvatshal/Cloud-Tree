import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dob: { type: Date },
  anniversary: { type: Date },
  parents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  children: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Member' }],
  spouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
  photo: { type: String, default: '' },
  phone: { type: String },
  email: { type: String },
  notes: { type: String },
}, { timestamps: true });

export default mongoose.model('Member', memberSchema);