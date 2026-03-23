# TechAstra Certificate Implementation Guide

This document provides a complete guide for implementing and distributing certificates for TechAstra events using Canva templates.

---

## Table of Contents

1. [Overview](#overview)
2. [Certificate Types](#certificate-types)
3. [Canva Template Setup](#canva-template-setup)
4. [Bulk Certificate Generation](#bulk-certificate-generation)
5. [Google Sheets Database Setup](#google-sheets-database-setup)
6. [File Naming & Organization](#file-naming--organization)
7. [Deployment Checklist](#deployment-checklist)
8. [Verification System](#verification-system)

---

## Overview

The certificate system works as follows:
1. Certificates are designed in Canva with placeholders
2. Bulk generation using Canva's Bulk Create feature
3. Export as PDF files with unique IDs
4. Upload to `certificates/` folder on the website
5. Store certificate metadata in Google Sheets
6. Users search by email and download their certificates

---

## Certificate Types

### 1. Winner Certificates
Create separate templates for each position:

| Position | Template Name | Color Accent (Suggested) |
|----------|---------------|--------------------------|
| 1st Place | `TechAstra-Winner-1st` | Gold (#FFD700) |
| 2nd Place | `TechAstra-Winner-2nd` | Silver (#C0C0C0) |
| 3rd Place | `TechAstra-Winner-3rd` | Bronze (#CD7F32) |

### 2. Participation Certificates
- Template Name: `TechAstra-Participation`
- Used for all participants who didn't win

### 3. Event-Specific Certificates
Create templates for each event:
- `TechAstra-Hackathon-Winner`
- `TechAstra-Hackathon-Participation`
- `TechAstra-CodingContest-Winner`
- `TechAstra-CodingContest-Participation`
- `TechAstra-Workshop-Attendance`
- etc.

### 4. Volunteer/Organizer Certificates
- `TechAstra-Volunteer`
- `TechAstra-Organizer`
- `TechAstra-CoreTeam`

---

## Canva Template Setup

### Step 1: Create Master Template

1. Open Canva and create a new design (A4 Landscape recommended: 297mm × 210mm)
2. Design your certificate with:
   - TechAstra branding/logo
   - IIEC logo
   - Event name
   - Certificate title
   - Border/decorative elements
   - Signature areas
   - QR code placeholder (optional)

### Step 2: Add Data Placeholders

Use Canva's **Bulk Create** feature. Add these text placeholders:

```
{{name}}           - Participant's full name
{{event}}          - Event name (e.g., "Hackathon")
{{date}}           - Date of event/issuance
{{position}}       - Winner position (1st, 2nd, 3rd) - for winner certs only
{{uid}}            - Unique certificate ID
{{team}}           - Team name (optional, for team events)
```

**How to add placeholders:**
1. Click on the text element
2. Right-click → "Connect data"
3. Or type `{{fieldname}}` directly

### Step 3: Template Dimensions & Quality

- **Dimensions:** A4 Landscape (297 × 210 mm) or Custom (1920 × 1080 px)
- **Export Format:** PDF Print (High Quality)
- **Color Mode:** CMYK for printing, RGB for digital only

---

## Bulk Certificate Generation

### Method 1: Canva Bulk Create (Recommended)

#### Step 1: Prepare CSV Data

Create a CSV file with participant data:

```csv
name,email,event,date,position,uid,team
John Doe,john@example.com,Hackathon,March 25 2026,1st Place,TA26-HC-001,Team Alpha
Jane Smith,jane@example.com,Hackathon,March 25 2026,2nd Place,TA26-HC-002,Team Beta
Bob Wilson,bob@example.com,Coding Contest,March 25 2026,Participant,TA26-CC-001,
```

#### Step 2: Upload to Canva

1. Open your certificate template in Canva
2. Click **"Apps"** → **"Bulk Create"**
3. Click **"Upload CSV"** or **"Enter data manually"**
4. Upload your CSV file
5. Map fields: Click each placeholder and select the corresponding column

#### Step 3: Generate & Export

1. Click **"Generate X designs"**
2. Review each certificate
3. Click **"Share"** → **"Download"**
4. Select **PDF Print** for best quality
5. Download all pages

### Method 2: Manual Generation (Small Batches)

For 10-20 certificates:
1. Duplicate template for each recipient
2. Manually replace placeholders
3. Export each as PDF
4. Rename files to match UID

---

## Google Sheets Database Setup

### Sheet Structure

Create a Google Sheet with these columns:

| Column | Field Name | Description | Example |
|--------|------------|-------------|---------|
| A | email | Participant's email (lowercase) | john@example.com |
| B | name | Full name | John Doe |
| C | event | Event name | Hackathon |
| D | docTitle | Certificate title | Winner Certificate |
| E | role | Position/Role | 1st Place Winner |
| F | date | Issue date | March 25, 2026 |
| G | uid | Unique ID (filename) | TA26-HC-001 |
| H | team | Team name (optional) | Team Alpha |

### UID Format Recommendation

Use a consistent format for unique IDs:

```
TA26-[EVENT]-[NUMBER]

Examples:
- TA26-HC-001  → TechAstra 2026, Hackathon, Certificate #001
- TA26-CC-042  → TechAstra 2026, Coding Contest, Certificate #042
- TA26-WS-015  → TechAstra 2026, Workshop, Certificate #015
- TA26-PT-123  → TechAstra 2026, Participation, Certificate #123
```

### Google Apps Script API

Your API endpoint handles TWO modes:

#### Mode 1: Search by Email (For Certificates Page)
Endpoint: `?action=search&email=john@example.com`

```javascript
// Example response format (array of certificates)
[
  {
    "uid": "EC-LOR-001",
    "name": "John Doe",
    "docType": "LOR",
    "docTitle": "Letter of Recommendation",
    "event": "TechAstra 2026",
    "role": "Participant",
    "date": "25 Mar 2026"
  }
]
```

#### Mode 2: Verify by ID (For QR Code / Verify Page)
Endpoint: `?id=EC-LOR-001`

```javascript
// Example response for VALID certificate
{
  "valid": true,
  "uid": "EC-LOR-001",
  "name": "John Doe",
  "docType": "LOR",
  "docTitle": "Letter of Recommendation",
  "event": "TechAstra 2026",
  "role": "Participant",
  "date": "25 Mar 2026"
}

// Example response for INVALID certificate
{
  "valid": false,
  "reason": "ID not found"
}

// Example response for REVOKED certificate
{
  "valid": false,
  "reason": "This certificate has been revoked."
}
```

#### Google Sheet Column Structure

| Column | Field | Description |
|--------|-------|-------------|
| A | UID | Certificate ID (e.g., EC-LOR-001) |
| B | NAME | Student Name |
| C | DOC_TYPE | Type (LOR, Certificate, etc.) |
| D | DOC_TITLE | Full Title |
| E | EVENT | Event Name |
| F | ROLE | Role/Position |
| G | DATE | Date of Issue |
| H | EMAIL | Email Address |
| I | STATUS | Active/Revoked |

---

## File Naming & Organization

### Folder Structure

```
iiec.in Website/
├── certificates/
│   ├── TA26-HC-001.pdf
│   ├── TA26-HC-002.pdf
│   ├── TA26-CC-001.pdf
│   └── ... (all certificate PDFs)
├── certificates.html
└── ...
```

### File Naming Convention

**IMPORTANT:** PDF filename MUST match the `uid` field in Google Sheets.

```
{uid}.pdf

Examples:
- TA26-HC-001.pdf
- TA26-CC-042.pdf
- TA26-PT-123.pdf
```

### Batch Renaming (After Canva Export)

If Canva exports with different names, use this PowerShell script to rename:

```powershell
# Create a mapping CSV: old_name, new_name (uid)
$mapping = Import-Csv "certificate_mapping.csv"

foreach ($item in $mapping) {
    $oldPath = "certificates/$($item.old_name).pdf"
    $newPath = "certificates/$($item.uid).pdf"
    if (Test-Path $oldPath) {
        Rename-Item $oldPath $newPath
    }
}
```

Or use a batch rename tool like:
- **Windows:** Bulk Rename Utility
- **Mac:** Name Mangler
- **Online:** Online file renamer tools

---

## Deployment Checklist

### Before Release

- [ ] All certificate templates finalized in Canva
- [ ] CSV data file prepared with all participants
- [ ] Bulk Create completed in Canva
- [ ] All PDFs exported
- [ ] PDFs renamed to match UIDs
- [ ] Google Sheets updated with all certificate records
- [ ] API endpoint tested
- [ ] `certificates/` folder created on website
- [ ] All PDFs uploaded to `certificates/` folder

### Testing

1. **Test API:**
   ```
   https://your-api-url?action=search&email=test@example.com
   ```

2. **Test Download Links:**
   - Verify `certificates/{uid}.pdf` URLs are accessible
   - Test on mobile and desktop

3. **Test Edge Cases:**
   - Email not found
   - Multiple certificates for same email
   - Special characters in names

### Post-Release

- [ ] Announce certificate availability
- [ ] Monitor for issues
- [ ] Track download analytics (optional)

---

## Verification System

The verification page (`verify.html`) is already created and ready to use.

### How It Works

1. User enters Certificate ID manually, OR
2. User scans QR code on certificate which auto-fills the ID
3. Page queries the API with `?id=XXX`
4. Displays verification result with certificate details

### URL Format

```
https://iiec.in/verify.html?id=EC-LOR-001
```

**Note:** The page also supports `?uid=` for backwards compatibility:
```
https://iiec.in/verify.html?uid=EC-LOR-001
```

### Adding QR Codes to Certificates (Canva)

1. In your Canva template, go to **Apps** → **QR Code**
2. Set the URL to: `https://iiec.in/verify.html?id={{uid}}`
3. Position the QR code on your certificate
4. When using Bulk Create, Canva auto-generates unique QR codes for each certificate

### Verification Features

- **Auto-verify from URL:** When accessed via QR code, automatically verifies
- **Manual entry:** Users can type ID manually
- **Valid certificates:** Shows green checkmark with all details
- **Revoked certificates:** Shows red X with "Certificate Revoked" message
- **Invalid certificates:** Shows red X with "Certificate Not Found" message
- **Download button:** Direct link to download the PDF
- **Responsive:** Works on mobile and desktop

---

## Quick Reference: Step-by-Step Workflow

### For Each Event:

1. **Collect Data**
   - Export participant list from registration
   - Add winner information manually

2. **Prepare CSV**
   ```csv
   name,email,event,date,position,uid
   ```

3. **Generate in Canva**
   - Open correct template (winner/participation)
   - Bulk Create → Upload CSV
   - Generate → Download PDFs

4. **Process Files**
   - Rename PDFs to `{uid}.pdf`
   - Upload to `certificates/` folder

5. **Update Database**
   - Add all entries to Google Sheets
   - Verify API returns correct data

6. **Release**
   - Announce via email/social media
   - Include link to `certificates.html`

---

## Troubleshooting

### Certificate Not Found
- Check email spelling (case-insensitive)
- Verify email in Google Sheets matches registration email
- Check for extra spaces in email field

### PDF Not Downloading
- Verify file exists in `certificates/` folder
- Check filename matches UID exactly (case-sensitive)
- Ensure `.pdf` extension

### Bulk Create Issues
- Maximum 500 records per batch in Canva
- For more, split into multiple batches
- Ensure no special characters break CSV parsing

---

## Contact

For technical issues with the certificate system:
- **Technical Team:** tech@iiec.in
- **General Queries:** ecell-student-rep@csmu.ac.in

---

*Last Updated: March 2026*
*Document Version: 1.0*
