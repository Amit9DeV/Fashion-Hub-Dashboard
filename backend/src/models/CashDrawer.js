import mongoose from "mongoose";

const cashDrawerSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true }, // Usually midnight local time
    openingBalancePaisa: { type: Number, required: true, min: 0 },
    cashSalesPaisa: { type: Number, default: 0 },
    cashRefundsPaisa: { type: Number, default: 0 },
    cashExpensesPaisa: { type: Number, default: 0 },
    expectedClosingBalancePaisa: { type: Number, default: 0 },
    actualClosingBalancePaisa: { type: Number },
    variancePaisa: { type: Number },
    status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

// Auto-calculate expected closing balance before save
cashDrawerSchema.pre("save", function (next) {
  this.expectedClosingBalancePaisa = 
    this.openingBalancePaisa + 
    this.cashSalesPaisa - 
    this.cashRefundsPaisa - 
    this.cashExpensesPaisa;
    
  if (this.actualClosingBalancePaisa !== undefined) {
    this.variancePaisa = this.actualClosingBalancePaisa - this.expectedClosingBalancePaisa;
  }
  next();
});

export default mongoose.models.CashDrawer || mongoose.model("CashDrawer", cashDrawerSchema);
