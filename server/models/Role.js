import mongoose from 'mongoose';

/** Persisted role catalogue (seeded from constants/roles.js). Allows future admin-editable roles. */
const roleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: String,
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Role = mongoose.model('Role', roleSchema);
