import fs from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import connectToDatabase from "../config/db.js";
import ProductVariant from "../models/ProductVariant.js";

const BARCODE_DIR = path.join(process.cwd(), "storage", "barcodes");

// Helper to generate a barcode buffer using bwip-js
const generateBarcodeImage = async (text) => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer({
      bcid: 'code128',
      text: text,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    }, function (err, png) {
      if (err) reject(err);
      else resolve(png);
    });
  });
};

// @route   POST /api/products/barcodes
// @desc    Generate a PDF with barcodes for selected variants
// @access  Private
export const generateBarcodes = async (req, res) => {
  try {
    const { items } = req.body; // Array of { variantId, quantity }
    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: "No items provided" });
    }

    await connectToDatabase();

    const doc = new PDFDocument({ size: "A4", margin: 20 });
    const fileName = `barcodes_${Date.now()}.pdf`;
    const filePath = path.join(BARCODE_DIR, fileName);
    const relPath = path.posix.join("storage/barcodes", fileName);

    await fs.mkdir(BARCODE_DIR, { recursive: true });

    const writeStream = doc.pipe(res); // Stream directly to response
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    // A4 Dimensions: 595.28 x 841.89
    // Label Size (approx 2" x 1"): 144 x 72 pt
    const labelWidth = 144;
    const labelHeight = 72;
    const cols = 4;
    const rows = 11;
    
    let x = 20, y = 20;
    let col = 0, row = 0;

    for (const item of items) {
      const variant = await ProductVariant.findById(item.variantId).populate("productId");
      if (!variant) continue;

      const barcodeText = variant.barcode || variant.sku;
      if (!barcodeText) continue;

      let barcodeImage;
      try {
         barcodeImage = await generateBarcodeImage(barcodeText);
      } catch (e) {
         continue;
      }

      for (let i = 0; i < item.quantity; i++) {
        // Draw the label boundary (optional, for debugging)
        // doc.rect(x, y, labelWidth, labelHeight).stroke();

        // Draw Product Name
        doc.fontSize(8).text((variant.productId?.name || "Product").substring(0, 25), x + 5, y + 5, { width: labelWidth - 10, align: "center" });
        
        // Draw MRP
        if (variant.mrpPaisa) {
          doc.fontSize(7).text(`MRP: Rs. ${variant.mrpPaisa / 100}`, x + 5, y + 15, { width: labelWidth - 10, align: "center" });
        }

        // Draw Barcode Image
        doc.image(barcodeImage, x + 10, y + 25, { width: labelWidth - 20, height: 30 });

        col++;
        x += labelWidth;
        if (col >= cols) {
          col = 0;
          x = 20;
          row++;
          y += labelHeight;
          if (row >= rows) {
            doc.addPage();
            x = 20;
            y = 20;
            row = 0;
          }
        }
      }
    }

    doc.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: "Could not generate barcodes" });
    }
  }
};
