# Pre-Deployment Checklist

## Router Configuration

### Winbox Setup
- [ ] **IP → Services**
  - [ ] HTTP service is enabled (port 80)
  - [ ] HTTPS service enabled (optional, if using HTTPS)
  - Note: If service is disabled, router won't accept REST API calls

- [ ] **IP → Hotspot → User Profiles**
  Create exactly these profiles (case-sensitive):
  - [ ] `1-Hour-Pass` (1 hour duration, 5 Mbps)
  - [ ] `24-Hour-Pass` (24 hour duration, 8 Mbps)
  - [ ] `7-Day-Pass` (7 day duration, 10 Mbps)
  - [ ] `6-Hour-Pass` (6 hour duration for Night Owl offer, 12 Mbps)
  - [ ] `48-Hour-Pass` (48 hour duration for Weekend Binge offer, 10 Mbps)
  - [ ] `Netflix-Special` (4 hour duration, 3 Mbps - optimized for streaming)
  - [ ] `Midnight-Oil-Pass` (5 hour duration, 5 Mbps - late night offer)
  
  Each profile should have configured:
  - Shared Users limit (e.g., 1 or more)
  - Rate limits if needed
  - Data limits if needed
  - Cookie Timeout appropriate for duration

- [ ] **Admin Credentials**
  - [ ] Verify admin username and password work
  - [ ] Test login to Winbox with these credentials

- [ ] **Network Connectivity**
  - [ ] Router is accessible on network
  - [ ] Default IP is `192.168.88.1` (verify if different)
  - [ ] No firewall blocking port 80 (REST API)

### Pre-Test Connectivity
```bash
# From the server running Starlinknet.WIFI:
ping 192.168.88.1                                    # Should respond
curl -u admin:password http://192.168.88.1/rest/system/identity   # Should return JSON
```

## Environment Configuration

### .env.local Setup
- [ ] `MPESA_ENVIRONMENT=sandbox` (or production)
- [ ] `MPESA_CONSUMER_KEY=...` (from Daraja)
- [ ] `MPESA_CONSUMER_SECRET=...` (from Daraja)
- [ ] `MPESA_SHORTCODE=174379` (or your shortcode)
- [ ] `MPESA_PASSKEY=...` (from Daraja)
- [ ] `MPESA_CALLBACK_URL=...` (your callback URL)
- [ ] `MIKROTIK_HOST=192.168.88.1` (router IP)
- [ ] `MIKROTIK_USER=admin` (router username)
- [ ] `MIKROTIK_PASSWORD=...` (**IMPORTANT: Set this!**)
- [ ] `MIKROTIK_TIMEOUT=5000` (optional, default is fine)

**Verification:**
```bash
grep MIKROTIK_ .env.local
# Should show all 4 variables
```

## Code Verification

### Build & Type Check
- [ ] `npm run build` completes successfully
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] ESLint passes (or warnings only): `npm run lint`

### File Structure
- [ ] `lib/mikrotik.ts` exists with exports:
  - [ ] `createMikrotikVoucher`
  - [ ] `testMikrotikConnection`
  - [ ] `getMikrotikConfig`
  - [ ] `getProfileName`
  
- [ ] `app/api/callback/route.ts` imports from `@/lib/mikrotik`
- [ ] `app/api/test-mikrotik/route.ts` exists
- [ ] `MIKROTIK_SETUP.md` exists
- [ ] `MIKROTIK_QUICKSTART.md` exists

## Staging Testing

### Start Dev Server
```bash
cd starlinknet-wifi
npm run dev
# Server starts on port 3000 (or next available)
```

### Test Connection Endpoint
```bash
curl http://localhost:3000/api/test-mikrotik

# Expected response:
# {
#   "success": true,
#   "message": "Connected to MikroTik router: MikroTik",
#   "config": {...}
# }

# Or if router not reachable:
# {
#   "success": false,
#   "message": "Failed to connect: ...",
#   "config": {...}
# }
```

- [ ] Endpoint returns JSON (not 404 or 500)
- [ ] Config shows correct host/username
- [ ] Success message if router is reachable

### Test M-Pesa Payment
- [ ] Initiate payment through UI
- [ ] M-Pesa prompt appears and completes
- [ ] Check server logs for messages:
  - [ ] `[/api/callback] Received M-Pesa callback`
  - [ ] `[Database] Creating voucher record`
  - [ ] `[MikroTik] Creating voucher ABC123XYZ`
  - [ ] `[MikroTik] ✓ Voucher ABC123XYZ successfully created`
- [ ] Check database:
  - [ ] Voucher record created with code
  - [ ] Active session created with expiry time
- [ ] Check Winbox:
  - [ ] **IP → Hotspot → Active Users** shows voucher
  - [ ] User can login with voucher code (no password)

### Failure Testing
- [ ] Disconnect router network (test timeout):
  - [ ] Logs show "Failed to create voucher"
  - [ ] But database record still exists
  
- [ ] Stop HTTP service on router (test auth error):
  - [ ] Logs show error with status code
  
- [ ] Use wrong profile (test profile not found):
  - [ ] Edit lib/mikrotik.ts temporarily to use wrong profile
  - [ ] Logs show clear error message

## Production Deployment

### Before Going Live
- [ ] All router profiles created and tested
- [ ] Credentials verified in .env.local
- [ ] Build tested in staging
- [ ] Payment callback URL matches deployment URL
- [ ] Logs monitored during test payments
- [ ] Team aware of monitoring process

### Deployment Steps
- [ ] Push code to production
- [ ] Set environment variables
- [ ] Run `npm run build` on production server
- [ ] Start application
- [ ] Run `/api/test-mikrotik` to verify connection
- [ ] Process test M-Pesa transaction
- [ ] Monitor logs for first 24 hours

### Post-Deployment Monitoring
- [ ] Check logs every 4 hours first day
- [ ] Monitor voucher creation success rate
- [ ] Check if any timeout errors
- [ ] Verify active users appear in Winbox
- [ ] Test customer WiFi login with generated voucher

## Troubleshooting Reference

**Connection fails:**
- [ ] Router IP correct in MIKROTIK_HOST
- [ ] HTTP service enabled in Winbox
- [ ] Network connectivity from server to router
- [ ] Firewall not blocking port 80

**Profile not found:**
- [ ] Check exact profile names in Winbox (case-sensitive!)
- [ ] Compare with mappings in lib/mikrotik.ts:getProfileName()

**Voucher created but not in router:**
- [ ] Check logs for specific error message
- [ ] Run `/api/test-mikrotik`
- [ ] Verify all profiles exist
- [ ] Check router system log in Winbox

**Request timeout:**
- [ ] Increase MIKROTIK_TIMEOUT if router is slow
- [ ] Check router CPU load
- [ ] Verify network latency to router

See **MIKROTIK_SETUP.md** for detailed troubleshooting.

## Rollback Plan

If issues occur:
1. Stop accepting M-Pesa payments
2. Revert to previous commit: `git revert <commit-hash>`
3. Redeploy
4. Or disable MikroTik integration: Comment out `createMikrotikVoucher` call
5. Investigate root cause
6. Test in staging before redeployment

## Support Contacts

- **M-Pesa Issues:** M-Pesa Daraja API documentation
- **MikroTik Issues:** RouterOS Winbox documentation
- **Code Issues:** Review IMPLEMENTATION_SUMMARY.md, MIKROTIK_SETUP.md
- **Connection Issues:** Test with `/api/test-mikrotik` endpoint

---

**Completion Status:**
- [ ] All items checked
- [ ] Ready for production deployment

**Date Completed:** ___________

**Deployed By:** ___________

**Notes:**
___________________________________________
___________________________________________
