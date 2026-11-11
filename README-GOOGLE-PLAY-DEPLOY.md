# V1 Garments — Google Play privacy / deletion website deployment

Source baseline: `vandhana-website(2).zip` (11 Nov 2026). This package updates **only the website**. The separately uploaded backend and admin projects were reviewed and **not changed**.

## Changes

1. Added the public **Privacy Policy** page at `/privacy-policy`.
2. Added the public **Request Account Deletion** page at `/account-deletion`.
3. Registered both routes in `src/App.tsx`.
4. Added both links to the website footer (`src/components/Footer.tsx`).
5. Replaced the broken Privacy Policy `#` link on the sign-in/sign-up page (`src/pages/Auth.tsx`). Also removed the unlinked Terms of Use acceptance claim; no Terms of Use policy was present in the supplied source.

The deletion page provides a clear email-based request flow to `v1garmentshelp@gmail.com` (with a prefilled subject/body and manual email fallback). This is an **account deletion request**, **not instant account deletion**. Google Play's policy explicitly accepts an email-based web request method. The business must monitor this mailbox, verify account ownership, delete the account and relevant personal information, and explain any records legally retained. Never ask customers to send their passwords or OTPs.

## Deploy (GitHub → Vercel)

**Recommended for a live GitHub project:** extract `V1Garments-GooglePlay-Website-Changed-Files.zip` and copy the five `src/...` files to the **website** repository with the same paths. Review the diff, commit, and push to the current production branch. Do NOT overwrite a newer live website with an older full ZIP.

**If you need the entire updated source:** use `V1Garments-Website-GooglePlay-Updated.zip`. It is based on the uploaded `vandhana-website(2).zip` and contains the complete website project, except no dependencies or built output.

Once Vercel finishes, open these in a private/incognito browser:

- `https://www.v1garments.com/privacy-policy`
- `https://www.v1garments.com/account-deletion`

Both should load without requiring login. On mobile, confirm text, buttons and footer links are visible. On account-deletion page, tap **Email Account Deletion Request** and confirm a mail client opens with the correct recipient and subject; if it does not, the plain support email is a fallback.

Only **after these pages are live**:

- Play Console → Privacy policy: `https://www.v1garments.com/privacy-policy`
- Play Console → Data safety → Delete account URL: `https://www.v1garments.com/account-deletion`

## Google Play mobile app note

The uploaded v1.7.2 Android app already has an in-app account-deletion request flow, according to the previously inspected mobile source. However, it still needs a **direct in-app Privacy Policy link or text** before final production review. A website-only deployment does not change the already published Android AAB, and a future mobile update will need a higher version code.

## Verification / limitations

- Checked that only five website files changed relative to the supplied ZIP.
- All five modified/new TSX files passed TypeScript syntax parsing.
- Verified both routes, footer/signup links, privacy content, email request action and Vercel SPA rewrite in source.
- **Full `npm run build` and browser end-to-end testing were not completed:** the package registry request timed out in this environment. Vercel deployment is not performed here.
- Review the Privacy Policy with the V1 Garments business owner: especially payment/logistics processors, actual data flows, retention obligations and contact mailbox access.
- The backend's existing `/account-deletion-request` API requires authenticated customers, so the public website deliberately does not call it without authentication. No DB schema changes were made.
