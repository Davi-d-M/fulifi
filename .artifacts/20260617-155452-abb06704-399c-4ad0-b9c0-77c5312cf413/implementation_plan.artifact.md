# [MikroTik Final Redirection & Branding]

This plan consolidates all necessary MikroTik configuration steps into a single verifiable script to resolve redirection issues and finalize the Starlinknet.WIFI branding.

## User Review Required

- **Laptop IP**: The user must replace `10.0.0.x` with their actual laptop IP in the script to ensure the server isn't blocked by the hotspot.

## Proposed Changes

### MikroTik Configuration
A single script to be executed in the MikroTik Terminal.

#### [NEW] [mikrotik_setup.sh](file:///C:/Users/hp/Desktop/fulifi/fulifi/public/mikrotik_setup.sh)
- Consolidation of session clearing, profile setting, walled garden rules, and IP bindings.

## Verification Plan

### Manual Verification
- **Phone Redirection**: Connect a phone to the WiFi and verify the portal pops up automatically and redirects to the Ngrok URL.
- **Manual Navigation**: Navigate to `http://10.0.0.1` on the phone and verify the Starlinknet.WIFI logo appears.
- **Payment Access**: Verify the Paystack checkout page loads while the device is in the unauthenticated state.
