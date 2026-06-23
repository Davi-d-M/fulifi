# Tasks

- [/] Research and Discovery
    - [x] Read `login.html` and understand redirection variables.
    - [x] Analyze `package.json` and dependencies.
    - [x] Review `MIKROTIK_SETUP.md` and `HOTSPOT_REDIRECTION.md`.
    - [x] Explore `app` directory and existing API routes.
- [ ] Implement Optimization Plan
    - [ ] Update `lib/mikrotik.ts` with robust REST commands and `activateHotspotSession`.
    - [ ] Optimize `app/page.tsx` with "Zero-Click" reconnect logic.
    - [ ] Create `scripts/generate-router-login.js` for automated `login.html` creation.
    - [ ] Create `scripts/setup-walled-garden.js` for automated Walled Garden setup.
    - [ ] Refactor environment variable usage.
- [ ] Verification
    - [ ] Test router connectivity.
    - [ ] Verify `login.html` redirection.
    - [ ] Test end-to-end payment and auto-login flow.
