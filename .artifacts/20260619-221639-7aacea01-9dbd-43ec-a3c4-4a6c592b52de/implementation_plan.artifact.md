# Field Reorder and Definitive Connection Fix

The goal is to improve the user experience on the billing page and resolve the persistent MikroTik connection issue once and for all.

## Proposed Changes

### [Billing Page](file:///C:/Users/hp/Desktop/fulifi/fulifi/app/page.tsx)

#### [page.tsx](file:///C:/Users/hp/Desktop/fulifi/fulifi/app/page.tsx)
- **Reorder Form Fields**: Move the "Email for Receipt" field above the "M-Pesa Phone Number" field.
- **Update Labels**: Ensure labels are clear and professional.

### [MikroTik Integration](file:///C:/Users/hp/Desktop/fulifi/fulifi/lib/mikrotik.ts)

#### [mikrotik.ts](file:///C:/Users/hp/Desktop/fulifi/fulifi/lib/mikrotik.ts)
- **Force Connection IP**: Hardcode the verified working IP (`10.5.50.1`) as the **ONLY** primary host in the library logic, removing any legacy `192.168.88.1` fallbacks that might be causing confusion.
- **Improved Logging**: Add a "Connection Handshake" log to verify successful REST communication.

---

## Why the connection is failing (The Explanation)

1. **Subnet Mismatch**: Your network uses `10.5.50.x`, but the original code was looking for `192.168.88.1`.
2. **Node.js Sandbox**: Even when we changed it, Windows often blocks the `node.exe` process from "seeing" the router even if the browser (Chrome) can.
3. **Environment Cache**: Sometimes Next.js caches old `.env` values. By hardcoding it into the library, we bypass this entirely.

---

## Verification Plan

### Manual Verification
1. **Check Form**: Verify Email is above Phone on the billing page.
2. **Verify Connection**: Click "Test Connection" in Admin; it should now use the hardcoded `10.5.50.1` and succeed.
