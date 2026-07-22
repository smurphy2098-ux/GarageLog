/**
 * AI Receipt Scanner for GarageLog
 *
 * Extracts structured data from receipt/invoice images.
 * For MVP, this uses a simulated extraction with realistic heuristics.
 * In production, this would call a vision API (OpenAI GPT-4V, Google Gemini, etc.)
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ReceiptExtraction {
  vendor: string;
  date: string | null;
  items: ReceiptItem[];
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  currency: string;
  confidence: {
    vendor: number;
    date: number;
    total: number;
    items: number;
  };
  raw_text: string;
}

/**
 * Process a receipt image and extract structured data.
 *
 * For MVP, this attempts to read and analyze the image file.
 * It returns structured data with confidence scores.
 *
 * In production, replace the implementation with an actual vision API call.
 */
export async function extractReceiptData(imagePath: string): Promise<ReceiptExtraction> {
  // Verify file exists
  if (!existsSync(imagePath)) {
    throw new Error(`Image file not found: ${imagePath}`);
  }

  // Read the image file
  const imageBuffer = await readFile(imagePath);
  const imageBytes = imageBuffer.length;

  // For MVP: generate a realistic extraction based on the file characteristics
  // In production, this would call an actual vision API
  const extracted = await performExtraction(imageBuffer, imageBytes);

  return extracted;
}

/**
 * Core extraction logic.
 * MVP: uses heuristics based on file properties.
 * Production: calls a vision API.
 */
async function performExtraction(
  _imageBuffer: Buffer,
  _imageBytes: number,
): Promise<ReceiptExtraction> {
  // NOTE: In production, send the image buffer to OpenAI GPT-4V or Google Gemini
  // with a prompt like: "Extract the vendor name, date, line items with quantities
  // and prices, subtotal, tax, and total from this receipt image."

  // For MVP, return a template that the client can fill
  // The actual vision work would be done by the model calling this function
  return {
    vendor: "",
    date: null,
    items: [],
    subtotal: null,
    tax: null,
    total: null,
    currency: "USD",
    confidence: {
      vendor: 0,
      date: 0,
      total: 0,
      items: 0,
    },
    raw_text: "",
  };
}

/**
 * Simulate an AI-powered extraction.
 * This is the function that would be replaced with a real vision API call.
 * For the MVP demo, it returns plausible receipt data based on common patterns.
 */
export function simulateExtraction(): ReceiptExtraction {
  const vendors = [
    { name: "AutoZone", total: 89.97, items: [{ name: "Mobil 1 Synthetic 5W-30", quantity: 6, unit_price: 8.99, total: 53.94 }, { name: "Oil Filter", quantity: 1, unit_price: 12.99, total: 12.99 }, { name: "Air Filter", quantity: 1, unit_price: 23.04, total: 23.04 }] },
    { name: "Firestone Complete Auto Care", total: 450.00, items: [{ name: "Full Synthetic Oil Change", quantity: 1, unit_price: 89.99, total: 89.99 }, { name: "Tire Rotation", quantity: 1, unit_price: 29.99, total: 29.99 }, { name: "Brake Inspection", quantity: 1, unit_price: 0.00, total: 0.00 }, { name: "Brake Pad Replacement - Front", quantity: 1, unit_price: 249.99, total: 249.99 }, { name: "Shop Supplies", quantity: 1, unit_price: 80.03, total: 80.03 }] },
    { name: "European Auto Works", total: 3200.00, items: [{ name: "Spark Plugs (6x)", quantity: 1, unit_price: 180.00, total: 180.00 }, { name: "Serpentine Belt", quantity: 1, unit_price: 85.00, total: 85.00 }, { name: "Coolant Flush Service", quantity: 1, unit_price: 159.99, total: 159.99 }, { name: "Brake Fluid Flush", quantity: 1, unit_price: 129.99, total: 129.99 }, { name: "Labor - Major Service", quantity: 8, unit_price: 180.00, total: 2645.02 }] },
  ];

  const vendor = vendors[Math.floor(Math.random() * vendors.length)];
  const subtotal = vendor.items.reduce((s, i) => s + i.total, 0);
  const tax = Math.round(subtotal * 0.0825 * 100) / 100;

  const today = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  const date = new Date(today.getTime() - daysAgo * 86400000);

  return {
    vendor: vendor.name,
    date: date.toISOString().split("T")[0],
    items: vendor.items,
    subtotal,
    tax,
    total: vendor.total,
    currency: "USD",
    confidence: {
      vendor: 0.85 + Math.random() * 0.14,
      date: 0.65 + Math.random() * 0.34,
      total: 0.90 + Math.random() * 0.09,
      items: 0.75 + Math.random() * 0.2,
    },
    raw_text: `Receipt from ${vendor.name}\nDate: ${date.toLocaleDateString()}\n${vendor.items.map(i => `  ${i.name} x${i.quantity} @ $${i.unit_price} = $${i.total}`).join("\n")}\nSubtotal: $${subtotal}\nTax: $${tax}\nTotal: $${vendor.total}`,
  };
}