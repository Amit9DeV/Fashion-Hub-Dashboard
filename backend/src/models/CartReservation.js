import mongoose from "mongoose";

const cartReservationSchema = new mongoose.Schema(
  {
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    quantity: { type: Number, required: true, min: 1 },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    sessionId: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.CartReservation || mongoose.model("CartReservation", cartReservationSchema);
