import connectToDatabase, { assertTransactionSupport } from "../config/db.js";
import CartReservation from "../models/CartReservation.js";
import ProductVariant from "../models/ProductVariant.js";
import mongoose from "mongoose";

// @route   POST /api/cart/heartbeat
// @desc    Reserve stock or renew reservation for cart items
// @access  Private
export const cartHeartbeat = async (req, res) => {
  try {
    const { sessionId: clientSessionId, items = [] } = req.body || {};
    if (typeof clientSessionId !== "string" || clientSessionId.length < 8 || clientSessionId.length > 100) {
      return res.status(400).json({ success: false, message: "A valid cart session ID is required." });
    }
    if (!Array.isArray(items) || items.length > 100 || items.some((item) =>
      !mongoose.isValidObjectId(item?.variantId) || !Number.isSafeInteger(item?.quantity) || item.quantity < 1 || item.quantity > 99
    )) {
      return res.status(400).json({ success: false, message: "Cart reservations need valid variants and quantities." });
    }
    const sessionId = `${req.user.id}:${clientSessionId}`;

    await connectToDatabase();
    assertTransactionSupport();
    
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
      // 1. Release all existing reservations for this session
      await CartReservation.deleteMany({ sessionId }, { session });

      // 2. Create new reservations (expires in 15 mins)
      if (items && items.length > 0) {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const variantIds = [...new Set(items.map((item) => item.variantId))];
        const activeReservations = await CartReservation.aggregate([
          { $match: { variantId: { $in: variantIds.map((id) => new mongoose.Types.ObjectId(id)) }, expiresAt: { $gt: new Date() } } },
          { $group: { _id: "$variantId", quantity: { $sum: "$quantity" } } },
        ]).session(session);
        const reservedByVariant = new Map(activeReservations.map((reservation) => [reservation._id.toString(), reservation.quantity]));
        const variants = await ProductVariant.find({ _id: { $in: variantIds }, status: "ACTIVE" }).select("stock").session(session).lean();
        const stockByVariant = new Map(variants.map((variant) => [variant._id.toString(), variant.stock]));
        
        for (const item of items) {
          const stock = stockByVariant.get(item.variantId.toString());
          const alreadyReserved = reservedByVariant.get(item.variantId.toString()) || 0;
          if (stock === undefined || item.quantity + alreadyReserved > stock) {
            throw new Error("One or more items no longer have enough available stock.");
          }

          await CartReservation.create([{
            sessionId,
            variantId: item.variantId,
            quantity: item.quantity,
            expiresAt
          }], { session });
          reservedByVariant.set(item.variantId.toString(), alreadyReserved + item.quantity);

        }
      }
      });
    } finally {
      await session.endSession();
    }

    return res.json({ success: true, message: "Cart reserved" });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 400).json({ success: false, message: error.message || "Could not reserve stock" });
  }
};
