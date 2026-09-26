# illuminate 2026 — Master Operations & System Guide
**Organized by:** Incubation, Innovation & Entrepreneurship Cell (IIEC), CSMU Panvel  
**In Official Collaboration with:** E-Cell, IIT Bombay  
**Target Event:** *illuminate 2026* Entrepreneurship Workshop  
**Special Fee:** ₹749 per student (NEC Special Fee)  
**Official Contact:** `iiec@csmu.ac.in` | **UPI Payee:** Bhumika Chavan (`chavanbhumika1007@oksbi`)

---

## 1. Executive Summary & Architecture

This document is the official operational guide for the IIEC organizing committee, registration desk, technical coordinators, and finance team. It details how the entire **illuminate 2026** web portal, 3-stage registration funnel, draft save/resume engine, Google Sheet backend, and QR check-in workflow operate.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             STUDENT FUNNEL                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  1. Lead Capture Form ──► Auto Draft Email (ID & 1-Click Resume Link)       │
│  2. UPI QR Payment (₹749) ──► 12-Digit UTR Submit ──► Payment Ack Email    │
│  3. Digital Pass Preview ──► 1-Click High-Res PNG Pass Download             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (Data syncs to Google Sheet)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ORGANIZER DESK & OPS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  4. Finance checks bank statement against submitted UTR                     │
│  5. Organizer marks Status as "Verified" in Sheet or Admin Console          │
│  6. System AUTOMATICALLY dispatches Official Delegate Pass with Gate QR     │
│  7. Event Day: Gate team scans QR on student pass to check-in               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Web Portal Features & Page Breakdown

### 🌐 Frontend Page: `https://iiec.in/illuminate` (`illuminate.html`)
- **Hero Stage**: Interactive headline, collaboration chip, floating executive pass preview, live counter pill, and rapid CTA buttons.
- **Curriculum Grid (4 Pillars)**:
  1. *Idea Validation & Problem Framing*
  2. *Business Model Canvas (BMC)*
  3. *Unit Economics & Pricing Strategy*
  4. *Pitching & Investor Readiness*
- **Deliverables & Perks**: Certified participation certificate by **E-Cell IIT Bombay**, physical startup kit, and incubation pipeline at CSMU.
- **Date & Venue Radar**: Complete venue directions for CSMU Panvel Campus with Google Maps integration.
- **Top Collaborative Strip**: Obsidian dark announcement bar linking directly to `#register`.
- **Global Mobile Navigation Drawer**: Synchronized across all 14 pages with live pulse badge and direct registration link.

---

## 3. The 3-Step Registration Funnel

### 📝 Step 1: Student Information & Automated Lead Capture
1. **Data Collected**:
   - Full Name, Email Address, Mobile (WhatsApp), College / University, Course / Degree, Year of Study.
   - Startup Idea status (*Yes / Exploring / No*), Prior Experience, and Learning Expectations.
   - Mandatory confirmations (accurate data, rules adherence, payment consent).
2. **Instant Lead Capture Action (`action: 'lead_capture'`)**:
   - When the student clicks **"Continue to Payment (₹749)"**, the frontend generates a unique ID: `ILL-XXXXXX`.
   - Data is stored in `localStorage` for offline protection.
   - Data is sent immediately to the Google Sheet with status **`Pending Verification`** and UTR placeholder `Step 1 (Pending Payment)`.
3. **Automated Lead Draft Email**:
   - The student instantly receives an email with their **Registration ID** and a personalized **1-Click Resume Link** (`https://iiec.in/illuminate?resume=ILL-XXXXXX`).
   - If they close the tab or lose internet, they can finish anytime.

---

### 💳 Step 2: UPI Payment & UTR Reference Submission
1. **Dynamic Payment Screen**:
   - Displays official payment QR Code (`assets/illuminate payment qr.jpeg`).
   - Clear receiver details: **Bhumika Chavan** (`chavanbhumika1007@oksbi`).
   - Workshop Fee: **₹749**.
   - **"Open UPI App on Mobile"** button (`upi://pay?pa=...`) for 1-tap mobile payment via Google Pay, PhonePe, Paytm, or BHIM.
2. **Save Draft & Finish Later**:
   - Students can click **"Save Draft & Finish Later"** to send another resume reminder to their inbox.
3. **12-Digit UTR Submission (`action: 'payment_submit'`)**:
   - Student enters their 12-digit transaction UTR / Reference ID and clicks **"Submit Verification"**.
   - Backend updates the existing row in Google Sheets with the submitted UTR and sets status to **`Pending Verification`**.
4. **Automated Payment Received Acknowledgment Email**:
   - The student receives an acknowledgment email confirming their UTR has been logged.
   - **Crucial Rule**: The official ticket pass is **NOT** sent yet. It informs the student that bank verification is in progress.

---

### 🎟️ Step 3: Registration Submitted & Digital Pass Preview
1. **Interactive Delegate Pass**:
   - Renders a light-themed pass card with official **IIEC CSMU × E-Cell IIT Bombay** branding, attendee credentials, UTR, fee tag (₹749 Paid), and gate verification QR.
2. **1-Click Download Pass (PNG)**:
   - Clicking **"Download Pass (PNG)"** uses an HTML5 Canvas generator (`js/illuminate.js`) to render and save a crisp single-image `.png` badge directly to their device.
   - **Fixes Multi-Page Blank Print Bug**: Replaces awkward 14-page browser print outputs with a clean pass image.
3. **Add to Calendar**:
   - Downloads a `.ics` calendar invite to schedule the workshop date in Google/Apple/Outlook calendars.

---

## 4. Draft Recovery & Resume System

Students can resume their registration at any time through two methods:
1. **Via Email Resume Link**:
   - Clicking the link in their draft email opens: `https://iiec.in/illuminate?resume=ILL-XXXXXX` (or `?id=ILL-XXXXXX`).
   - The portal loads their draft from Google Sheets, populates all fields, and jumps directly to Step 2 (Payment).
2. **Via Top Resume Bar**:
   - At the top of the registration form, students can click **"Resume Saved Registration"**, enter their `ILL-XXXXXX` ID or registered email, and restore their session.

---

## 5. Security QR Code & Live Database Verification

Every pass generated (on-page, downloaded PNG, and official email) contains a dynamic security QR code pointing to:
```text
https://iiec.in/illuminate?verify=ILL-XXXXXX
```

### How Live Verification Works:
1. When scanned by a phone camera or barcode reader, it opens `illuminate.html` with the **Official Database Registry Modal**.
2. The modal queries the live Google Sheet via `action: 'verify'` and displays:
   - **Attendee Name & College**
   - **Registration ID & Submission Date**
   - **Payment Verification Status** (`Verified ✅` / `Pending Verification ⏳` / `Rejected ❌`)
   - **Gate Check-In Status** (`Checked In 🎟️` / `Not Checked In`)

---

## 6. Google Sheets Backend & Organizer Menu Guide

### 📊 Spreadsheet Structure: `illuminate Registrations`
| Col | Header | Description |
|:---:|:---|:---|
| **A (1)** | `Timestamp` | Date & time of registration submission |
| **B (2)** | `Registration ID` | Unique ID (e.g. `ILL-749102`) |
| **C (3)** | `Full Name` | Student's full name |
| **D (4)** | `Email Address` | Registered email |
| **E (5)** | `Mobile Number` | WhatsApp mobile number |
| **F (6)** | `College / University` | Student's institution |
| **G (7)** | `Course` | Academic course (e.g. B.Tech CSE) |
| **H (8)** | `Year of Study` | Year of study |
| **I (9)** | `Has Startup Idea?` | Yes / Exploring / No |
| **J (10)** | `Attended Before?` | Yes / No |
| **K (11)** | `Expectations` | Student learning expectations |
| **L (12)** | `Agreed to Terms?` | Yes |
| **M (13)** | `UTR / Transaction ID`| 12-digit transaction reference |
| **N (14)** | **`Payment Status`** | **`Pending Verification`**, **`Verified`**, or **`Rejected`** |
| **O (15)** | `Verification Date` | Timestamp when payment was verified |
| **P (16)** | `Notes / Rejection Reason` | Internal organizer notes |
| **Q (17)** | `Ticket Sent?` | `Yes` or `No` |
| **R (18)** | `Ticket Sent Timestamp`| Timestamp when ticket email was sent |
| **S (19)** | `Verified By` | Email of organizer who verified |
| **T (20)** | `Check-In Status` | `Checked In` or `Not Checked In` |

---

### 🛠️ How to Verify Payments & Send Official Passes

Organizers have **4 ways** to verify payments:

#### Method A: Direct Cell Dropdown Edit (Easiest)
1. Match the student's UTR in Column M with the bank / UPI statement.
2. In Column N (**Payment Status**), change the dropdown from `Pending Verification` to **`Verified`**.
3. The `onEdit` background trigger **automatically**:
   - Sends the **Official Delegate Pass & Ticket Email** with the entry QR code.
   - Sets Column Q (**Ticket Sent?**) to `Yes`.
   - Records your email in Column S (**Verified By**).

#### Method B: Custom Menu for Selected Row
1. Click on the row of the student.
2. Go to Google Sheet top menu: **⚡ illuminate Admin** ➔ **💳 Payment & Verification** ➔ **✅ Verify & Send Ticket (Selected Row)**.

#### Method C: Batch Dispatch for All Verified (Unsent)
1. Go to: **⚡ illuminate Admin** ➔ **💳 Payment & Verification** ➔ **🚀 Send Tickets to ALL Verified (Unsent)**.
2. Sends official ticket emails to all approved students in one batch.

#### Method D: Interactive Sidebar / Mobile Web Console
1. In Sheet: **⚡ illuminate Admin** ➔ **📱 Open Admin Console (Sidebar)**.
2. On Mobile / Tablet Browser:
   ```text
   https://script.google.com/macros/s/AKfycby7QscQp692FD9ut0Gh-QbmuoktP4YKYzyObS1acqLdMznEsA-E4cXP_e4dcePSVEEM/exec?admin=true
   ```
3. Search by Name, Email, or Reg ID, and click **[Verify & Send Ticket]**.

---

## 7. Event Day Gate Entry & Attendance Desk

On the day of the workshop at CSMU Panvel campus:

1. **Attendee Arrival**: Attendee presents their printed pass, downloaded phone image, or pass email.
2. **Scanning**:
   - **Option 1**: Scan the QR code using a handheld barcode/2D scanner hooked to a laptop with the **Admin Sidebar** open.
   - **Option 2**: Gate volunteers use mobile phones to open the **Mobile Web Admin Console** (`?admin=true`).
   - **Option 3**: In Google Sheets, click **⚡ illuminate Admin** ➔ **🎟️ Check-In & Gate Attendance** ➔ **⚡ Rapid Check-In (Enter / Scan Reg ID)**.
3. **Duplicate Prevention**: If an attendee is already checked in, the system raises an immediate alert with their previous entry timestamp.

---

## 8. Automated Email Templates Summary

All emails are dispatched through Google Apps Script using high-deliverability HTML templates with official IIEC branding (`https://iiec.in/assets/logos/iiec-logo.webp`) and `iiec@csmu.ac.in` reply-to:

| Email Type | Trigger | Purpose |
|:---|:---|:---|
| **1. Lead Draft Saved** | Step 1 Completed | Sends Registration ID + 1-Click Resume Link so student can finish payment later. |
| **2. Payment Acknowledgment** | UTR Submitted (Step 2) | Confirms UTR received and informs student that payment is under manual verification. |
| **3. Official Delegate Pass** | Status marked `Verified` | **Official Ticket Pass** with Gate Entry QR Code, reporting instructions, agenda & venue map. |
| **4. Rejection Notice** *(Optional)* | Status marked `Rejected` | Informs student of invalid UTR/payment issue with instructions on how to resubmit. |
| **5. Broadcast Announcements** | Admin Menu ➔ Broadcast | Sends mass updates, reminders, or venue instructions to all/verified students. |

---

## 9. Quick Checklist for the Team

- [ ] **Verify UTRs Daily**: Check the bank statement twice daily and update Column N to `Verified`.
- [ ] **Follow Up on Drafts**: Filter Column M for `Step 1 (Pending Payment)` to contact leads via WhatsApp/Phone and assist them in completing registration.
- [ ] **Test Email Delivery**: Use **⚡ illuminate Admin** ➔ **🧪 Send Test Ticket Email to Me** before starting a batch verification.
- [ ] **Gate Scanner Setup**: Ensure desk laptops have the Google Sheet open with the Admin Sidebar active on event morning.
- [ ] **Support Inquiries**: Direct all student queries to `iiec@csmu.ac.in` or the helpline at `+91 94666 05579`.
