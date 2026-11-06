# V1 Garments Website — Mobile Category Cards Fix

Scope: WEBSITE ONLY. No backend, database, Android APK/AAB, or desktop UI changes.

## Fix
- Corrected a CSS selector in `src/styles/mobile-ui.css` that mistakenly forced category NAME text into a 28 x 28 pixel box (instead of sizing the arrow icon).
- Mobile name text is now flexible, responsive (14–18px), and can wrap naturally without clipping.
- Category arrow remains right aligned, independently sized 18 x 18 pixels.
- Mobile category row gap reduced from 12px to 7px; column gap reduced to 10px.

## Safest way to deploy
Only replace `src/styles/mobile-ui.css` in your CURRENT website Git repository, preserving any newer site changes. Commit and push that file; Vercel should redeploy if Git integration is enabled.

## Testing
A browser-based layout test was run at 320, 360, 393, 430, and 540px viewport widths using category names BOTTOM WEAR, INNER WEAR, SHIRTS, T-SHIRTS, and WINTER WEAR. All labels and chevrons stayed inside the card boundaries, and the row gap was 7px. This was a focused layout test, not a full production deployment or live API test.

The full ZIP contains the WEBSITE directory from the previously supplied `V1Garments-Full-Source-Updated-1.6` archive, plus this CSS fix. If you have more recent changes on GitHub, do NOT replace your entire current website with the older full ZIP. Use only the changed CSS file.
