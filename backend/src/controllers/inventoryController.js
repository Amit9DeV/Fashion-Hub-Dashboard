import connectToDatabase from "../config/db.js";
import Product from "../models/Product.js";
import ProductVariant from "../models/ProductVariant.js";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const getInventory = async (req, res) => {
  try {
    await connectToDatabase();
    const query = req.query.query?.trim() || "";
    
    const pipeline = [
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
    ];

    if (query) {
      const search = new RegExp(escapeRegExp(query), "i");
      pipeline.push({
        $match: {
          $or: [
            { sku: search },
            { barcode: search },
            { color: search },
            { size: search },
            { "product.name": search },
            { "product.categorySnapshot": search },
            { "product.brandSnapshot": search },
          ]
        }
      });
    }

    pipeline.push({ $sort: { stock: 1 } });

    const results = await ProductVariant.aggregate(pipeline);

    const variants = results.map(v => ({
      ...v,
      productId: v.product._id,
      productName: v.product.name,
      category: v.product.categorySnapshot,
      brand: v.product.brandSnapshot,
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
