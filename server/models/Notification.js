import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['member_added', 'member_edited', 'member_deleted', 'birthday', 'anniversary'], required: true },
  message:   { type: String, required: true },
  read:      { type: Boolean, default: false },
  memberId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Member', default: null },
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);