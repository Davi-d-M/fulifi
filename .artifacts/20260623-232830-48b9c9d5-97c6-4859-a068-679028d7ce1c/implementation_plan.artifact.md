# Full Setup Optimization Plan - Fulifi.WIFI

This plan outlines the steps to "fully optimize" the captive portal setup, focusing on seamless user experience (Zero-Click Login), robust redirection, and automated router configuration.

## User Review Required

- **Portal URL Strategy**: Currently, the setup uses `oil-cinnamon-starfish.ngrok-free.dev`. We will move this to a central environment variable.
- **Auto-Login Privacy**: Automatically logging users in based on MAC address improves UX but might have privacy implications for shared devices. We'll proceed as it's standard for hotspots.

## Proposed Changes

### [Frontend Optimization]
Improve the captive portal's responsiveness and add "Zero-Click" reconnection logic.

#### [app/page.tsx](file:///C:/Users/hp/Desktop/fulifi/fulifi/app/page.tsx)
- Add an `autoReconnect` effect that checks if the device is already authorized.
- If a valid session is found for the MAC, automatically trigger `loginRouter`.
- Improve error messaging for missing MAC addresses.

---

### [Backend & Router Integration]
Enhance the communication between the Next.js app and the MikroTik router.

#### [lib/mikrotik.ts](file:///C:/Users/hp/Desktop/fulifi/fulifi/lib/mikrotik.ts)
- Implement `activateHotspotSession` using the REST API.
- Add retry logic for `executeRestCommand` to handle intermittent network issues.
- Standardize on REST API for all operations if port 80/443 is used.

#### [app/api/pay/verify/route.ts](file:///C:/Users/hp/Desktop/fulifi/fulifi/app/api/pay/verify/route.ts)
- Ensure that once a payment is verified, the session is immediately pushed to the router.

---

### [Router Setup Automation]
Create tools to simplify the configuration of the MikroTik router.

#### [NEW] [scripts/generate-router-login.js](file:///C:/Users/hp/Desktop/fulifi/fulifi/scripts/generate-router-login.js)
- A script that generates a production-ready `login.html` for the router, using the `NEXT_PUBLIC_BASE_URL`.

#### [NEW] [scripts/setup-walled-garden.js](file:///C:/Users/hp/Desktop/fulifi/fulifi/scripts/setup-walled-garden.js)
- A script to automatically add Paystack, M-Pesa, and other required domains to the MikroTik Walled Garden.

---

### [Configuration]

#### [.env.local](file:///C:/Users/hp/Desktop/fulifi/fulifi/.env.local)
- Ensure `NEXT_PUBLIC_BASE_URL` is set to the current production/dev domain.

## Verification Plan

### Automated Tests
- Run `node scripts/generate-router-login.js` to verify HTML generation.
- Test `/api/test-mikrotik` to ensure REST API connectivity.

### Manual Verification
1. **Redirection Test**: Access `login.html` locally with mock params and verify it redirects to the correct portal URL.
2. **Auto-Login Test**: Pay for a voucher, disconnect, reconnect, and verify that the portal automatically logs the device back in.
3. **Walled Garden Test**: Verify that all domains in the setup script are reachable from a locked device.
