# RK FASHION — setup

Static site (HTML/CSS/ES modules) + Firebase Auth/Firestore + Cloudinary. Config for project `rk-portfolio-eb485` and Cloudinary `fkmbapdm` / `rk-fashion` is already in `js/`.

## 1. Firebase console (one time)
1. **Authentication → Sign-in method:** enable Email/Password. **Users → Add user:** `raghadkhaled700612@gmail.com` with a strong password you choose (never put it in code).
2. Copy that user's **UID**. In **Firestore → Start collection `admins`**, add a document whose **ID is the UID** (any field, e.g. `role: "owner"`). This is the only thing that grants admin access; rules block everyone from writing `admins`.
3. **Authentication → Settings → Authorized domains:** add your hosting domain.

## 2. Deploy rules, index, site
```
npm i -g firebase-tools && firebase login
firebase use rk-portfolio-eb485
firebase deploy --only firestore,hosting
```
Local test: `npx serve .` (ES modules need http, not file://).

## 3. Cloudinary
Settings → Upload → preset `rk-fashion` must be **Unsigned**. Set allowed formats `jpg,png,webp,avif,pdf`, a max file size (e.g. 10 MB) and a folder like `rk-fashion`. Gallery images get `f_auto,q_auto` and width transforms in the browser.

## 4. Delete function (needed to remove files from Cloudinary)
Requires the Firebase Blaze plan.
```
firebase functions:secrets:set CLOUDINARY_API_KEY
firebase functions:secrets:set CLOUDINARY_API_SECRET
cd functions && npm i && cd .. && firebase deploy --only functions
```
Without it, deleting in the dashboard still removes the Firestore record, but the file stays in Cloudinary and a notice is shown.

## 5. First run
Sign in at `/admin.html`, fill **Site content** (bio, CV, contact links — nothing is pre-filled), then add images in **Gallery**.

## Known limits
- Unsigned uploads mean anyone could upload to the preset; limit formats/size in Cloudinary and consider moving public attachments to a signed flow later.
- Request duplicate protection is client-side (button lock); add App Check or a Cloud Function for stronger abuse control.
