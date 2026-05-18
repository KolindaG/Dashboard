# SMIB NPL Dashboard — Netlify Deployment Guide

## Project Structure

```
smib-dashboard/
├── netlify.toml
├── index.html          ← Public dashboard (read-only, auto-loads data)
├── admin.html          ← Admin panel (password-protected)
└── netlify/functions/
    ├── get.mjs         ← Public read API
    └── admin.mjs       ← Admin write API
```

---

## One-Time Setup

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "SMIB dashboard"
git remote add origin https://github.com/YOUR_USERNAME/smib-dashboard.git
git push -u origin main
```

### 2. Connect Netlify
Netlify → Add new site → Import from GitHub → select repo → Deploy site

### 3. Set Admin Password  ⚠️ REQUIRED
Netlify → Site settings → Environment variables → Add variable  
**Key:** `ADMIN_PASSWORD`  **Value:** your chosen password (e.g. `SMIB@2026!`)  
Then: Deploys → Trigger deploy → Deploy site

---

## Daily Use

### Admin (you)
1. Visit `https://your-site.netlify.app/admin.html`  
2. Enter admin password  
3. Upload All Loan Report CSV → set Month/Year → Upload Report  
4. All users see the new month immediately on next page load

### Users (branch staff)
1. Visit `https://your-site.netlify.app`  
2. Dashboard loads automatically — no upload needed  
3. Use Branch, Product, Period filters as normal

---

## CSV Column Requirements

**All Loan Report:**  `BranchName` · `ProductGroup` · `FINAL STAGE` · `TotalPrincipal`  
Data is aggregated (Branch × Product × Stage → sum) before storing. No raw loan records uploaded.

**Branch NPL Targets:**  `BranchName` · `Jan` · `Feb` · ... · `Dec`  
Values as percentages, e.g. `27.66` = 27.66%

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Dashboard shows "Connection failed" | Check Netlify Functions tab — functions must be deployed |
| Admin login: "Incorrect password" | Verify `ADMIN_PASSWORD` env var is set & site redeployed |
| Upload error 500 | Check Netlify → Functions → admin → Logs |
| Branch names don't match targets | Ensure exact spelling match between report CSV and targets CSV |
