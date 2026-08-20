import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    actor: { id: String, name: String, role: String },
    metadata: mongoose.Schema.Types.Mixed,
    occurredAt: { type: Date, required: true },
  },
  { timestamps: true }
);

auditLogSchema.pre("save", function () {
  if (!this.isNew) throw new Error("Audit records are append-only.");
});

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
