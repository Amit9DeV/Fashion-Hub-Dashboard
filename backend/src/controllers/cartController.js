import connectToDatabase from "../config/db.js";
import CartReservation from "../models/CartReservation.js";
import ProductVariant from "../models/ProductVariant.js";
import mongoose from "mongoose";

// @route   POST /api/cart/heartbeat
// @desc    Reserve stock or renew reservation for cart items
// @access  Private
export const cartHeartbeat = async (req, res) => {
  try {
    const { sessionId, items } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: "Session ID required" });

    await connectToDatabase();
    
    const session = await mongoose.startSession();
    const isStandalone = !process.env.MONGODB_URI.includes("replicaSet");
    if (isStandalone) {
      session.endSession();
    }
    const runBlock = isStandalone ? (cb) => cb() : (cb, opts) => session.withTransaction(cb, opts);

    await runBlock(async () => {
      // 1. Release all existing reservations for this session
      const existing = await CartReservation.find({ sessionId }).session(isStandalone ? null : session);
      for (const res of existing) {
        await ProductVariant.updateOne(
          { _id: res.variantId },
          { $inc: { reserved: -res.quantity } },
          { session: isStandalone ? null : session }
        );
      }
      await CartReservation.deleteMany({ sessionId }, { session: isStandalone ? null : session });

      // 2. Create new reservations (expires in 15 mins)
      if (items && items.length > 0) {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
        for (const item of items) {
          await CartReservation.create([{
            sessionId,
            variantId: item.variantId,
            quantity: item.quantity,
            expiresAt
          }], { session: isStandalone ? null : session });

          await ProductVariant.updateOne(
            { _id: item.variantId },
            { $inc: { reserved: item.quantity } },
            { session: isStandalone ? null : session }
          );
        }
      }
    });

    return res.json({ success: true, message: "Cart reserved" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not reserve stock" });
  }
};
