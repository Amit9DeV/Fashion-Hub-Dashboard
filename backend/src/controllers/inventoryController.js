import connectToDatabase from "../config/db.js";
import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";

export const getInventory = async (req, res) => {
  try {
    await connectToDatabase();
    
    // Aggregate ProductVariant and join Product to get name/category
    const results = await ProductVariant.aggregate([
      { $match: { status: "ACTIVE" } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      { $match: { "product.status": "ACTIVE" } },
      { $sort: { stock: 1 } }
    ]);

    const variants = results.map(v => ({
      ...v,
      productId: v.product._id,
      productName: v.product.name,
      category: v.product.categorySnapshot,
      product: undefined // clean up
    }));

    return res.json({ 
      success: true, 
      data: { variants } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Could not fetch inventory." });
  }
};
