import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String },
  sequence: { type: Number, default: 0 },
});

export default mongoose.models.Counter || mongoose.model("Counter", counterSchema);
