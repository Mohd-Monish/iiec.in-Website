# illuminate 2026 — Google Sheet & Apps Script Backend Setup Guide

This guide walks you through deploying the Google Sheet database and Google Apps Script automation for **illuminate 2026** (an Entrepreneurship Workshop by E-Cell IIT Bombay organized at CSMU by IIEC).

---

## Overview of System Architecture

```
Student Registration (illuminate.html)
        │
        ▼ (Step 1: Student details submitted)
Generates Registration ID (ILL-XXXXXX)
        │
        ▼ (Step 2: Dynamic UPI QR Code for ₹749 generated)
Student pays via UPI & submits 12-digit UTR
        │
        ▼ (POST request via js/illuminate.js)
Google Sheet Database ("illuminate Registrations" tab)
        │
        ▼ (Status: "Pending Verification")
Admin reviews UTR in Sheet & changes status to "Verified"
        │
        ▼ (Automatic Trigger onEdit or Menu Action)
Automated Responsive HTML Ticket Email Sent to Attendee
(With unique check-in QR code, workshop agenda & venue details)
```

---

## Step 1: Create the Google Spreadsheet

1. Open [Google Sheets](https://sheets.google.com) and create a **blank spreadsheet**.
2. Name the spreadsheet: `illuminate 2026 Registrations — IIEC CSMU`.

---

## Step 2: Open Apps Script & Paste the Backend Code

1. In the spreadsheet menu, go to:
   **Extensions** ➔ **Apps Script**
2. In the Apps Script code editor, delete any default code (`function myFunction() { ... }`).
3. Open [`illuminate_code.gs`](file:///d:/E-Cell%20Website/IIEC.in/iiec.in%20Website/illuminate_code.gs) from this repository.
4. Copy its entire content and paste it into the editor.
5. Press **Ctrl + S** (or click the Save icon).

---

## Step 3: Run Sheet Setup

1. In the function dropdown at the top of the Apps Script toolbar (next to "Debug"), select **`setupSheet`**.
2. Click the **▷ Run** button.
3. Google will show an **"Authorization required"** modal on first run:
   - Click **Review permissions**.
   - Select your Google account.
   - Click **Advanced** (bottom left of modal).
   - Click **Go to Untitled project (unsafe)**.
   - Click **Allow**.
4. The script will format the spreadsheet with:
   - **"illuminate Registrations"** tab with frozen headers, formatted widths, and dropdown validation (`Pending Verification`, `Verified`, `Rejected`).
   - **"Dashboard & Stats"** tab with live formulas calculating Total Registrations, Total Collections (`₹749 × Verified`), and Attendance.

---

## Step 4: Deploy as Web App (Public Webhook)

1. At the top right of the Apps Script editor, click **Deploy** ➔ **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure the deployment settings:
   - **Description:** `illuminate 2026 Webhook API`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone` *(Crucial: allows the website form to submit registrations without requiring users to log into Google)*
4. Click **Deploy**.
5. Copy the **Web app URL** (it ends in `/exec`).

---

## Step 5: Connect Endpoint to Website

1. Open [`js/illuminate.js`](file:///d:/E-Cell%20Website/IIEC.in/iiec.in%20Website/js/illuminate.js).
2. Locate line 19 in `CONFIG`:
   ```javascript
   APPS_SCRIPT_URL: '' 
   ```
3. Paste your copied `/exec` URL:
   ```javascript
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby7QscQp692FD9ut0Gh-QbmuoktP4YKYzyObS1acqLdMznEsA-E4cXP_e4dcePSVEEM/exec'
   ```
4. Configured! Your website is now live and recording submissions directly into your Google Sheet!

---

## Step 6: Using the illuminate Admin Panel

You have a complete suite of organizer tools right inside your Google Sheet and on the web:

### 📱 1. Interactive Admin Console (Sidebar)
Click **⚡ illuminate Admin** ➔ **📱 Open Admin Console (Sidebar)** to open the organizer hub inside your sheet:
- **Real-Time Live Counters**: Submissions, Verified Paid, Pending UTR, Checked-In Attendees, and Total Collections (₹).
- **Attendee Lookup**: Search any attendee by Registration ID, Email, Phone, or UTR with 1-click **[Verify & Send Ticket]**, **[Mark Checked In]**, and **[Resend Ticket]**.
- **Gate Entry Desk**: Auto-focused rapid check-in box for barcode/QR scanners on event day.
- **1-Click Batch Actions**: Dispatch tickets to all unsent verified participants in one click.

---

### 💳 2. Payment Verification & Ticket Dispatch
- **Automatic on Edit**: In the **"illuminate Registrations"** tab, change Column N (**Payment Status**) to **`Verified`**. The script automatically records your email in Column S, dispatches the branded HTML ticket pass, and marks Column Q (**Ticket Sent?**) to `Yes`.
- **Selected Row Action**: Highlight a student row and click **⚡ illuminate Admin** ➔ **💳 Payment & Verification** ➔ **✅ Verify & Send Ticket (Selected Row)**.
- **Batch Send Tickets**: Click **⚡ illuminate Admin** ➔ **💳 Payment & Verification** ➔ **🚀 Send Tickets to ALL Verified (Unsent)**.
- **Resend Ticket**: Click **⚡ illuminate Admin** ➔ **💳 Payment & Verification** ➔ **🔄 Resend Ticket Email (by Reg ID / Email)**.
- **Reject Registration**: Click **⚡ illuminate Admin** ➔ **💳 Payment & Verification** ➔ **❌ Reject Registration (Selected Row)**. Enter reason (e.g. invalid UTR) and optionally send a polite rejection email instructing the student how to resubmit.

---

### 🎟️ 3. Event Day Gate Check-In & Attendance
- **Rapid Scanner Tool**: Click **⚡ illuminate Admin** ➔ **🎟️ Check-In & Gate Attendance** ➔ **⚡ Rapid Check-In (Enter / Scan Reg ID)**. Scans or takes an ID and marks them `Checked In` with green highlight, alerting if already checked in!
- **Toggle Check-In**: Highlight a row and click **⚡ illuminate Admin** ➔ **🎟️ Check-In & Gate Attendance** ➔ **🔘 Toggle Check-In Status (Selected Row)**.

---

### 📢 4. Email Broadcast Tool
Need to notify attendees about reporting time, venue instructions, or payment reminders?
1. Click **⚡ illuminate Admin** ➔ **📢 Broadcast Announcement / Reminder Email**.
2. Select target audience:
   - `1` = Verified Attendees Only (ticket holders)
   - `2` = Pending Verification Only (payment reminder)
   - `3` = ALL Registered Students
3. Enter email subject and announcement body.
4. Confirm preview to broadcast the branded IIEC × E-Cell IIT Bombay email!

---

### 🌐 5. Standalone Web Admin View (Mobile / Tablet)
Organizers on event day can access the full admin console in their mobile browser without opening Google Sheets:
```text
https://script.google.com/macros/s/AKfycby7QscQp692FD9ut0Gh-QbmuoktP4YKYzyObS1acqLdMznEsA-E4cXP_e4dcePSVEEM/exec?admin=true
```

---

## Updating Google Apps Script with New Version
1. Open your Google Sheet ➔ **Extensions** ➔ **Apps Script**.
2. Copy the full contents of [`illuminate_code.gs`](file:///d:/E-Cell%20Website/IIEC.in/iiec.in%20Website/illuminate_code.gs) and paste it into the editor, replacing old code.
3. Click **Save** (`Ctrl + S`).
4. Click **Deploy** ➔ **Manage deployments** ➔ Click the **Pencil icon (Edit)** ➔ Under Version choose **New version** ➔ Click **Deploy**.
5. Refresh your Google Sheet. The new **⚡ illuminate Admin** menu and sidebar console are active!
