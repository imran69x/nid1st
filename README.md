# Bangladesh NID & Birth Certificate Smart Scanner

A modern, fast, and responsive web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Google Gemini Vision AI** (`gemini-3.5-flash-lite`).

It automatically scans Bangladeshi National ID (NID Smart Card and Old Laminated Cards) and Digital Birth Registration Certificates (জন্ম নিবন্ধন সনদ), extracting all visible data with high precision.

---

## Key Features

1. **High-Speed AI Vision Extraction**:
   - Powered by Gemini Vision (`gemini-3.5-flash-lite` on the free API tier).
   - Near-instant (1-2 seconds) processing compared to slow browser-side Tesseract.

2. **Accurate Official Transliteration**:
   - Accurately converts Bengali abbreviations to official Bangladeshi English standards:
     - `মোছাঃ` / `মোসাঃ` $\rightarrow$ **`MST.`** (e.g. মোছাঃ রেহানা খাতুন $\rightarrow$ `MST. REHANA KHATUN`, never `MOSA:`)
     - `মোঃ` / `মুঃ` $\rightarrow$ **`MD.`** (e.g. মোঃ রফিকুল ইসলাম $\rightarrow$ `MD. RAFIQUL ISLAM`)
     - Automatic English transliteration for Father and Mother names even if English is not printed on the physical card.

3. **Strict Date of Birth Format**:
   - Automatically standardizes any date representation (e.g. `10 Jan 2001`, `10/01/2001`, `১০ জানু ২০০১`) to **`DD-MM-YYYY`** (e.g. `10-01-2001`).

4. **Multi-Document / Family Member Batch Scanning**:
   - Supports uploading or capturing multiple NIDs and Birth Certificates in one session.
   - Organizes results neatly into **সদস্য ১ (Member 1)**, **সদস্য ২ (Member 2)**, etc.

5. **Clean Display (Zero Clutter)**:
   - Card images automatically hide once scanned for clean, privacy-first view.
   - Core 3 actions only:
     - **Scan (স্ক্যান করুন)**
     - **Add Another (আরেকটি যোগ করুন)**
     - **Retake (নতুন করে নিন / রিসেট)**
   - Individual **Copy** button beside every field + **Copy All (সব কপি করুন)** button per member.

6. **Database Users & Admin Control Panel**:
   - Custom database-driven authentication (`dbUsers` collection in Firestore).
   - Default initial admin: `admin` / `password: admin123`.
   - Admin Panel allows:
     - Creating new database users with `username`, `password`, and `isAdmin` toggle.
     - Locking/Blocking users: blocked users receive the message: *"You are locked/blocked. Please contact our support."*
     - Toggling scanning feature ON/OFF globally.
   - **3-Line Hamburger Menu Sidebar**: Hidden by default on all devices; reveals slide-over drawer on click. Admin Panel is only visible if `isAdmin` is `true`.

---

## Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Client-side Firebase Configuration (Web App)
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"

# Server-Side Only Secret (Never exposed to client)
GEMINI_API_KEY="your-gemini-api-key"
```

---

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run Development Server**:
   ```bash
   npm run dev
   ```

3. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.
Log in with `admin` / `admin123` to access the Scanner and Admin Panel.
