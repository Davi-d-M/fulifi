# MikroTik Integration Setup Guide

This guide explains how to integrate MikroTik RouterOS with Starlinknet.WIFI's M-Pesa payment system for automatic hotspot voucher generation.

## Overview

When a user pays via M-Pesa, the system:
1. Receives payment confirmation from M-Pesa
2. Generates a voucher code
3. Saves the voucher to the database
4. **Pushes the voucher to MikroTik RouterOS** (this integration)
5. Creates an active session record

## Architecture

The integration uses MikroTik's REST API (HTTP) to communicate with RouterOS on port 80:

```
Payment Callback → Voucher Database → MikroTik REST API → Router Memory → Hotspot Users
```

### Key Components

- **`lib/mikrotik.ts`** — Core utility functions for router communication
- **`app/api/callback/route.ts`** — M-Pesa payment callback handler
- **`app/api/test-mikrotik/route.ts`** — Connection testing endpoint

## Prerequisites

### Router Setup

1. **Enable REST API** on your MikroTik router:
   - Open Winbox and connect to your router
   - Navigate to **IP → Services**
   - Ensure **http** is enabled (port 80) or **https** (port 443)
   - If using https, you may need to handle certificate validation

2. **Create User Profiles** in Winbox:
   - Navigate to **IP → Hotspot → User Profiles**
   - Create these profiles:
     - `1-Hour-Pass` (1 hour duration, 5 Mbps)
     - `24-Hour-Pass` (24 hour duration, 8 Mbps)
     - `7-Day-Pass` (7 day duration, 10 Mbps)
     - `6-Hour-Pass` (6 hour duration, 12 Mbps - for Night Owl offer)
     - `48-Hour-Pass` (48 hour duration, 10 Mbps - for Weekend Binge offer)
     - `Netflix-Special` (4 hour duration, 3 Mbps - optimized for video streaming)
     - `Midnight-Oil-Pass` (5 hour duration, 5 Mbps - for Midnight Oil offer)

3. **Configure Admin Credentials**:
   - Ensure you have the admin username and password
   - These will be used for Basic Auth to the REST API

## Environment Configuration

### Required Environment Variables

Add these to `.env.local`:

```env
# MikroTik RouterOS Configuration
MIKROTIK_HOST=192.168.88.1              # Router IP address (default: 192.168.88.1)
MIKROTIK_USER=admin                     # Router username (default: admin)
MIKROTIK_PASSWORD=your_password_here    # Router password (REQUIRED - set this!)
MIKROTIK_TIMEOUT=5000                   # Request timeout in milliseconds (default: 5000)
```

## Network Connectivity

### Ensure Connectivity

The server running Starlinknet.WIFI must be able to reach the MikroTik router:

**For local network:**
```bash
# Test connectivity from your server
ping 192.168.88.1

# Test HTTP access
curl -u admin:password http://192.168.88.1/rest/system/identity
```

**For remote servers:**
- If Starlinknet.WIFI runs outside the local network, you may need:
  - Port forwarding on the router (not recommended for security)
  - VPN/tunnel connection to the local network
  - Or deploy Starlinknet.WIFI within the same network

## Testing the Integration

### Test Connection Endpoint

Once deployed, test the MikroTik connection:

```bash
curl http://localhost:3000/api/test-mikrotik
```

Expected response (success):
```json
{
  "success": true,
  "message": "Connected to MikroTik router: MikroTik",
  "config": {
    "host": "192.168.88.1",
    "username": "admin",
    "timeout": 5000
  }
}
```

Expected response (failure):
```json
{
  "success": false,
  "error": "Failed to connect: Network error or invalid credentials"
}
```

### Test Payment Flow

1. Complete a payment through M-Pesa
2. Check server logs for MikroTik creation messages:
   ```
   [MikroTik] Creating voucher ABC123XYZ with profile 1-Hour-Pass on 192.168.88.1
   [MikroTik] ✓ Voucher ABC123XYZ successfully created on router
   ```
3. Verify in Winbox: **IP → Hotspot → Active Users** — the voucher should appear

## Troubleshooting

### Connection Failures

**Problem:** "Failed to connect to router"

**Solutions:**
1. Verify router IP in MIKROTIK_HOST is correct
2. Ensure REST API (HTTP port 80) is enabled in Winbox → IP → Services
3. Check network connectivity: `ping <MIKROTIK_HOST>`
4. Verify firewall allows port 80 to router

### Authentication Failures

**Problem:** Status 401 or 403

**Solutions:**
1. Verify MIKROTIK_USER and MIKROTIK_PASSWORD are correct
2. Test credentials in Winbox by connecting manually
3. Ensure user has admin privileges

### Profile Not Found

**Problem:** "Profile 1-Hour-Pass not found"

**Solutions:**
1. Verify all required profiles exist in Winbox (IP → Hotspot → User Profiles)
2. Check profile names match exactly (case-sensitive)
3. Compare with mapping in `lib/mikrotik.ts`

### Timeout Issues

**Problem:** Request timeout after 5 seconds

**Solutions:**
1. Increase MIKROTIK_TIMEOUT (e.g., 10000 for 10 seconds)
2. Check router CPU usage — may be overloaded
3. Test router responsiveness: `curl http://192.168.88.1/rest/system/identity`

### Voucher Created But Not in Router

**Problem:** Database shows voucher created, but not in Hotspot Users

**Solutions:**
1. Check logs for "MikroTik push failed" message
2. Run `/api/test-mikrotik` endpoint to diagnose connection
3. Verify all profiles exist in Winbox
4. Check router's system log in Winbox for API errors

## Code Reference

### Creating Vouchers Programmatically

```typescript
import { createMikrotikVoucher } from '@/lib/mikrotik';

// In your payment handler:
const result = await createMikrotikVoucher('ABC123XYZ', '1hr');

if (result.success) {
  console.log(`Voucher ${result.voucherCode} created on profile ${result.profileName}`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

### Testing Connection

```typescript
import { testMikrotikConnection } from '@/lib/mikrotik';

const result = await testMikrotikConnection();
console.log(result.message);
```

### Configuration

```typescript
import { getMikrotikConfig } from '@/lib/mikrotik';

const config = getMikrotikConfig();
console.log(`Connecting to ${config.host} as ${config.username}`);
```

## API Endpoints

### `POST /api/callback`
Receives M-Pesa payment confirmations and automatically creates vouchers

**Flow:**
1. M-Pesa sends callback with payment details
2. Code validates payment was successful
3. Generates voucher code
4. Creates database records
5. Pushes voucher to MikroTik router

### `GET /api/test-mikrotik`
Tests MikroTik connection and configuration

**Response:**
```json
{
  "success": boolean,
  "message": string,
  "config": {
    "host": string,
    "username": string,
    "timeout": number
  }
}
```

## Profile Mapping

The system maps package IDs to MikroTik user profiles:

| Package ID | Profile Name | Duration | Price | Bandwidth | Details |
|-----------|--------------|----------|-------|-----------|---------|
| `1hr` | `1-Hour-Pass` | 1 hour | 15 KES | 5 Mbps | Standard short pass |
| `24hr` | `24-Hour-Pass` | 24 hours | 50 KES | 8 Mbps | Full day access |
| `7day` | `7-Day-Pass` | 7 days | 250 KES | 10 Mbps | Weekly access |
| `offer_1hr` | `1-Hour-Pass` | 1 hour | 10 KES | 15 Mbps | Power Hour flash deal |
| `offer_netflix` | `Netflix-Special` | 4 hours | 30 KES | 3 Mbps | Optimized for HD streaming |
| `offer_night` | `6-Hour-Pass` | 6 hours | 30 KES | 12 Mbps | Midnight to 6 AM |
| `offer_midnight_oil` | `Midnight-Oil-Pass` | 5 hours | 25 KES | 5 Mbps | Late night: 10 PM to 3 AM |
| `offer_weekend` | `48-Hour-Pass` | 48 hours | 100 KES | 10 Mbps | Friday night to Sunday night |

Edit `lib/mikrotik.ts:getProfileName()` to add new mappings.

## Security Considerations

- **Credentials**: MIKROTIK_PASSWORD is sensitive — use strong passwords
- **Network**: Restrict router API access to trusted servers
- **HTTP vs HTTPS**: Consider using HTTPS if router supports it
- **Timeout**: Set reasonable timeout to prevent hanging requests

## Monitoring

### Logging

The integration logs all operations:
- `[MikroTik]` — Router API operations
- `[Database]` — Database operations
- `[/api/callback]` — Payment callback processing
- `[Router]` — Router-specific issues

Useful patterns to search logs:
- `failed` — Failed operations
- `timeout` — Connection timeouts
- `Created voucher` — Successful voucher creation

### Metrics to Track

- Voucher creation success rate
- Average API response time
- Connection failure frequency
- Router uptime

## Maintenance

### Regular Tasks

1. **Monitor logs** — Check for repeated failures
2. **Backup profiles** — Export User Profiles from Winbox regularly
3. **Test connection** — Run `/api/test-mikrotik` monthly
4. **Review performance** — Check API response times in logs

### Debugging Steps

If vouchers aren't being created:
1. Test M-Pesa callback: Check if `/api/callback` receives requests
2. Test connection: Visit `/api/test-mikrotik`
3. Check credentials: Verify MIKROTIK_USER and MIKROTIK_PASSWORD
4. Check profiles: Ensure all required profiles exist in Winbox
5. Check network: `ping` router from server
6. Check router: View system logs in Winbox for API errors

## Support

For issues:
1. Check logs in your server/deployment platform
2. Run `/api/test-mikrotik` to diagnose connection
3. Verify all prerequisites are met
4. Consult Troubleshooting section above
