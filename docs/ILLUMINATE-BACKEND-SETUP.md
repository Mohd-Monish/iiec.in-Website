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

## Step 6: Verifying Payments & Sending Ticket Emails

You have two easy ways to verify payments and send tickets:

### Method A: Automatic on Edit (Recommended)
1. In the Google Sheet, open the **"illuminate Registrations"** tab.
2. Find the row with the student's submitted UTR.
3. In Column N (**Payment Status**), click the dropdown and change it to **`Verified`**.
4. The backend script will automatically:
   - Record who verified the row in Column S (**Verified By**).
   - Generate and email the participant their official HTML ticket with dynamic check-in QR code.
   - Mark Column Q (**Ticket Sent?**) to **`Yes`** and record the exact timestamp in Column R.

### Method B: Custom Menu Action
1. Click on the student's row in the sheet.
2. In the top spreadsheet menu, click **illuminate Workshop** ➔ **Verify & Send Ticket (Selected Row)**.
3. Confirm the popup dialog.

### Batch Sending Unsent Tickets
If you have verified multiple rows at once, click:
**illuminate Workshop** ➔ **Send Tickets to ALL Verified (Unsent)**.

---

## Testing Your Setup

1. In Apps Script, select `testSendTicketToMyself` from the function dropdown and click **Run**.
2. Check your inbox to preview the HTML ticket and QR code.
3. Submit a test registration from `illuminate.html` in your browser. Verify that the row appears in your Google Sheet with status `Pending Verification` and your submitted UTR!
