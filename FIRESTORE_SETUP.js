// ════════════════════════════════════════════════════
// FIRESTORE SECURITY RULES
// Paste this into: Firebase Console → Firestore → Rules
// ════════════════════════════════════════════════════

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Shop-scoped: only the authenticated owner can read/write their shop data
    match /shops/{shopId}/{document=**} {
      allow read, write: if request.auth != null
                        && request.auth.uid == shopId;
    }

    // Block all other paths
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

// ════════════════════════════════════════════════════
// FIRESTORE INDEXES
// Create these in: Firebase Console → Firestore → Indexes → Composite
// ════════════════════════════════════════════════════

/*
  INDEX 1 — Transactions by timestamp (Ledger page)
  Collection group: transactions
  Fields:
    timestamp   DESC
  Scope: Collection group

  INDEX 2 — Transactions by date range (Reports / Dashboard)
  Collection group: transactions
  Fields:
    timestamp   ASC
  Scope: Collection group

  INDEX 3 — Products by category + name (POS / Inventory)
  Collection group: products
  Fields:
    category    ASC
    name        ASC
  Scope: Collection group

  INDEX 4 — Low stock alert (Dashboard)
  Collection group: products
  Fields:
    stock       ASC
  Scope: Collection group

  INDEX 5 — Customers by name (Customers page)
  Collection group: customers
  Fields:
    name        ASC
  Scope: Collection group
*/

// ════════════════════════════════════════════════════
// DEMO: How to initialize the app for a new user
// ════════════════════════════════════════════════════

/*
  After first login, open browser console on any page and run:

    import { seedDemoData } from "./js/firebase.js";
    await seedDemoData();

  This will populate:
  - 12 sample products across all categories
  - 6 sample customers

  Only run ONCE per account.
*/

// ════════════════════════════════════════════════════
// FIREBASE HOSTING CONFIGURATION
// firebase.json
// ════════════════════════════════════════════════════

/*
{
  "hosting": {
    "public": ".",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "/app/**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|html)",
        "headers": [
          { "key": "Cache-Control", "value": "max-age=3600" }
        ]
      }
    ]
  }
}
*/

// ════════════════════════════════════════════════════
// DEPLOYMENT COMMANDS
// ════════════════════════════════════════════════════

/*
  # 1. Install Firebase CLI
  npm install -g firebase-tools

  # 2. Login
  firebase login

  # 3. Initialize (in project root)
  firebase init hosting
  → Select existing project: kerala-smart-pos
  → Public directory: . (current directory)
  → Single page app: No
  → GitHub deploys: No

  # 4. Deploy
  firebase deploy

  # 5. View live site
  https://kerala-smart-pos.web.app
*/
