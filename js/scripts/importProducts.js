import { col } from "../firebase.js";
import { addDoc, serverTimestamp } from "firebase/firestore";

const products = [
  // Staples
  { name: "Basmati Rice (5kg)", price: 650, stock: 25, category: "staples" },
  { name: "Idli Rice (2kg)", price: 120, stock: 40, category: "staples" },
  { name: "Ragi Flour (1kg)", price: 90, stock: 30, category: "staples" },
  { name: "Maida (1kg)", price: 55, stock: 50, category: "staples" },
  { name: "Chana Dal (1kg)", price: 110, stock: 35, category: "staples" },
  { name: "Urad Dal (1kg)", price: 140, stock: 20, category: "staples" },
  { name: "Jaggery (500g)", price: 60, stock: 18, category: "staples" },
  { name: "Rock Salt (1kg)", price: 35, stock: 45, category: "staples" },

  // Dairy
  { name: "Milk (1L)", price: 60, stock: 60, category: "dairy" },
  { name: "Paneer (200g)", price: 90, stock: 12, category: "dairy" },
  { name: "Curd (500g)", price: 45, stock: 20, category: "dairy" },
  { name: "Buttermilk (200ml)", price: 20, stock: 35, category: "dairy" },
  { name: "Cheese Slices", price: 130, stock: 15, category: "dairy" },
  { name: "Ghee (500ml)", price: 320, stock: 10, category: "dairy" },

  // Snacks
  { name: "Lays Chips", price: 20, stock: 80, category: "snacks" },
  { name: "Kurkure", price: 20, stock: 70, category: "snacks" },
  { name: "Good Day Biscuits", price: 35, stock: 50, category: "snacks" },
  { name: "Marie Gold", price: 30, stock: 60, category: "snacks" },
  { name: "Dairy Milk", price: 40, stock: 45, category: "snacks" },
  { name: "KitKat", price: 30, stock: 40, category: "snacks" },
  { name: "Namkeen Mix (200g)", price: 55, stock: 25, category: "snacks" },

  // Beverages
  { name: "Pepsi (750ml)", price: 40, stock: 50, category: "beverages" },
  { name: "Coca-Cola (1L)", price: 60, stock: 45, category: "beverages" },
  { name: "Frooti", price: 20, stock: 60, category: "beverages" },
  { name: "Red Bull", price: 120, stock: 10, category: "beverages" },
  { name: "Tata Tea (250g)", price: 140, stock: 20, category: "beverages" },
  { name: "Nescafe Coffee (100g)", price: 280, stock: 12, category: "beverages" },
  { name: "Boost (500g)", price: 320, stock: 8, category: "beverages" },

  // Toiletries
  { name: "Toothbrush", price: 25, stock: 50, category: "toiletries" },
  { name: "Shampoo (Sachet)", price: 2, stock: 200, category: "toiletries" },
  { name: "Shampoo Bottle", price: 180, stock: 20, category: "toiletries" },
  { name: "Facewash", price: 120, stock: 15, category: "toiletries" },
  { name: "Handwash", price: 90, stock: 18, category: "toiletries" },
  { name: "Sanitary Pads", price: 45, stock: 25, category: "toiletries" },
  { name: "Hair Oil (100ml)", price: 85, stock: 30, category: "toiletries" },

  // Household
  { name: "Surf Excel (1kg)", price: 210, stock: 22, category: "household" },
  { name: "Rin Bar", price: 25, stock: 60, category: "household" },
  { name: "Harpic (500ml)", price: 110, stock: 18, category: "household" },
  { name: "Phenyl (1L)", price: 95, stock: 20, category: "household" },
  { name: "Dishwash Liquid", price: 120, stock: 25, category: "household" },
  { name: "Garbage Bags", price: 60, stock: 40, category: "household" },
  { name: "Scrub Pad", price: 20, stock: 70, category: "household" },

  // Stationary
  { name: "Ball Pen", price: 10, stock: 150, category: "stationary" },
  { name: "Pencil", price: 5, stock: 200, category: "stationary" },
  { name: "Eraser", price: 5, stock: 120, category: "stationary" },
  { name: "Sharpener", price: 10, stock: 100, category: "stationary" },
  { name: "Notebook (A4)", price: 60, stock: 40, category: "stationary" },
  { name: "Long Notebook", price: 50, stock: 45, category: "stationary" },
  { name: "Sticky Notes", price: 40, stock: 25, category: "stationary" },
  { name: "Highlighter", price: 30, stock: 30, category: "stationary" },
  { name: "Geometry Box", price: 120, stock: 15, category: "stationary" }
];

export async function importProducts() {
  // Prevent duplicate execution
  if (window._productsImported) {
    console.log("Already imported this session.");
    return;
  }
  window._productsImported = true;

  try {
    for (const product of products) {
      // Adding nameNormalized and timestamps to match existing schema
      await addDoc(col.products(), {
        ...product,
        nameNormalized: product.name.trim().toLowerCase(),
        barcode: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    console.log("✅ Products imported successfully!");
    alert("✅ 60+ Products imported successfully! Check your inventory.\\n\\nIMPORTANT: Remove the import code now to prevent duplicates!");
  } catch (err) {
    console.error("❌ Import failed:", err);
    alert("❌ Import failed: " + err.message);
  }
}
