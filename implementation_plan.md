# Implementation Plan - Phase 4: Going Live (Deployment)

## Goal Description
Deploy "Hebrew Math Adventures" to the public internet using a "Big Cloud" provider (GCP/AWS/Azure) to ensure scalability, reliability, and professional infrastructure.

## Deployment Strategy: Big Cloud vs. Frontend Cloud
The user requested "Big Cloud" options. Here is the comparison and recommendation:

### 🏆 Recommendation: Google Firebase Hosting (GCP)
**Why?**
- **Effective "Big Cloud":** It *is* Google Cloud Platform, but wrapped in a developer-friendly interface.
- **True Free Tier:** The "Spark" plan is generous for free usage.
- **Speed:** Google's global CDN is incredibly fast.
- **Simplicity:** Easier to set up than raw AWS/Azure for a static site.

### 🥈 Alternative: AWS Amplify
- **Why?** It's the AWS equivalent of Vercel/Firebase.
- **Pros:** Deep integration if you use other AWS services later.
- **Cons:** The AWS Console can be intimidatingly complex.

### 🥉 Alternative: Azure Static Web Apps
- **Why?** Great if you are already in the Microsoft ecosystem.
- **Pros:** Great VS Code integration.

## User Review Required
> [!IMPORTANT]
> **Decision Point:** I have written the plan for **Firebase Hosting (GCP)** below, as it is my primary recommendation for this specific project.
> If you prefer AWS or Azure, let me know, and I will rewrite Step 2.

## Proposed Changes

### 📦 Step 1: Prepare Codebase
#### [MODIFY] [vite.config.ts](file:///d:/Projects/Hebrew%20Educational%20Game/vite.config.ts)
- Verify `build.outDir` is set to `dist` (default) for Firebase to detect.

### 📦 Step 2: Deployment (Firebase Hosting)
**Prerequisite:** You need a Google Account.
1.  **Install CLI:** Run `npm install -g firebase-tools`.
2.  **Login:** Run `firebase login`.
3.  **Initialize:** Run `firebase init hosting`.
    - Select "Use an existing project" or "Create a new project".
    - Public directory: `dist`.
    - Configure as a single-page app (rewrites all urls to /index.html)? **Yes**.
    - Set up automatic builds and deploys with GitHub? **Yes** (Recommended) or No.
4.  **Deploy:** Run `npm run build` then `firebase deploy`.

### 📦 Step 3: Post-Deployment Polish
#### [NEW] [firebase.json](file:///d:/Projects/Hebrew%20Educational%20Game/firebase.json)
- Created automatically during initialization.
- Can configure caching headers for performance.

#### [MODIFY] [README.md](file:///d:/Projects/Hebrew%20Educational%20Game/README.md)
- Add "Hosted on Firebase" badge.

## Verification Plan

### Automated Tests
- `npm run build` to ensure the `dist` folder is generated correctly.

### Manual Verification
- **Deploy Test:** Run `firebase deploy` and check the output URL.
- **Routing Test:** Refresh the page while on a sub-route (e.g., `/game`) to ensure the SPA rewrite works.
