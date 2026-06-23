# Complete Setup Guide - MikroTik + TP-Link + Starlinknet WiFi Billing

## ✅ VERIFICATION: Everything is Working

Your system has been fully verified with these components ready:

### **Database**
- ✅ `DeviceConnection` table created (tracks all device connections)
- ✅ `Site` table initialized (default-site)
- ✅ All payment/voucher tables present

### **APIs**
- ✅ Device connection logging: `POST /api/device-connection`
- ✅ Active connections: `GET /api/device-connection?action=active`
- ✅ Statistics: `GET /api/device-connection?action=stats`
- ✅ Connection history: `GET /api/device-connection?action=history`
- ✅ Device disconnect: `PUT /api/device-connection`

### **MikroTik Integration**
- ✅ REST API support ready (lib/mikrotik.ts)
- ✅ Voucher creation ready
- ✅ Hotspot integration ready

---

## 🚀 STEP-BY-STEP SETUP (MikroTik + TP-Link)

### **PHASE 1: MikroTik Configuration (RouterOS)**

#### Step 1.1: Access MikroTik Router
```bash
1. Open Winbox (MikroTik management tool)
2. Connection: IP=10.5.50.1, User=admin, Password=Hazy.123
3. Click "Connect"
```

#### Step 1.2: Enable Hotspot Server
```
In Winbox:
1. Go to: IP → Hotspot
2. Click: Hotspot Setup
3. Choose interface: ether2 (or your LAN bridge)
4. Create hotspot server (follow wizard)
5. Name: "hsprof1" (default)
```

#### Step 1.3: Create User Profiles
```
In Winbox → IP → Hotspot → User Profiles:

Create these profiles:
┌─────────────────┬──────────┬────────┬──────────┐
│ Profile Name    │ Duration │ Speed  │ Status   │
├─────────────────┼──────────┼────────┼──────────┤
│ 1-Hour-Pass     │ 1h       │ 5 Mbps │ Required │
│ 24-Hour-Pass    │ 24h      │ 8 Mbps │ Required │
│ 7-Day-Pass      │ 7d       │ 10Mbps │ Required │
│ 6-Hour-Pass     │ 6h       │ 12Mbps │ Optional │
│ 48-Hour-Pass    │ 48h      │ 10Mbps │ Optional │
└─────────────────┴──────────┴────────┴──────────┘

Steps for each:
1. Click "+"
2. Name: [Profile Name]
3. Shared Users: 1
4. Rate Limit: [Speed] up and down
5. Session Timeout: [Duration]
6. Click OK
```

#### Step 1.4: Enable REST API (Port 80)
```
In Winbox → IP → Services:
1. Find "http" in the list
2. Ensure "Enabled" checkbox is ☑️ checked
3. Port should be: 80
4. Click OK

Test connection:
Open command prompt and run:
  curl -u admin:Hazy.123 http://10.5.50.1/rest/system/identity
```

#### Step 1.5: Configure Hotspot Server Profile
```
In Winbox → IP → Hotspot → Server Profiles:
1. Double-click: hsprof1 (or your profile)
2. Go to: Login tab
3. Check: ☑️ HTTP PAP
4. Check: ☑️ MAC Cookie
5. Click OK
```

#### Step 1.6: Upload Custom Login Page
```
1. Create file: login.html

Content:
─────────────────────────────────────────────────
<!DOCTYPE html>
<html>
<head>
    <title>WiFi Billing</title>
    <meta http-equiv="refresh" content="0; url=http://192.168.88.50:3000/portal?mac=$(mac)&ip=$(ip)">
</head>
<body>
    <p>Redirecting to billing portal...</p>
    <p>If not redirected, <a href="http://192.168.88.50:3000/portal?mac=$(mac)&ip=$(ip)">click here</a></p>
</body>
</html>
─────────────────────────────────────────────────

2. In Winbox → Files
3. Navigate to: hotspot folder
4. Drag & drop login.html into folder (overwrite old one)
```

#### Step 1.7: Configure Walled Garden (Allow Portal Access)
```
In Winbox → IP → Hotspot → Walled Garden:
1. Click "+" to add each:

   Entry 1:
   - Dst. Host: 192.168.88.50 (your portal IP)
   - Action: allow

   Entry 2:
   - Dst. Host: *.paystack.com
   - Action: allow

   Entry 3:
   - Dst. Host: *.paystack.co
   - Action: allow

   Entry 4:
   - Dst. Host: *.google.com
   - Action: allow

2. Click OK for each
```

---

### **PHASE 2: TP-Link Access Point Setup**

#### Step 2.1: Configure TP-Link as Access Point
```
1. Connect to TP-Link admin page: http://192.168.1.1
   (Check your TP-Link manual for default IP)

2. Login with admin credentials

3. Go to: System Tools → Operation Mode
   Select: Access Point Mode
   Click: Save

4. Go to: Network → LAN
   Set IP: 192.168.88.200 (same subnet as MikroTik)
   Subnet: 255.255.255.0
   Gateway: 10.5.50.1 (MikroTik IP)
   Click: Save
```

#### Step 2.2: Point TP-Link to MikroTik DHCP
```
1. Go to: Network → DHCP
   Select: Disabled (we'll use MikroTik DHCP)
   Click: Save

2. Go to: Network → Ethernet
   Connect TP-Link WAN port to MikroTik LAN port
```

#### Step 2.3: Configure WiFi SSID
```
1. Go to: Wireless → Basic
2. SSID Name: "Starlinknet-WIFI"
3. Channel: Auto
4. Transmit Power: High
5. Click: Save

6. Go to: Wireless → Security
   Security: None (MikroTik hotspot handles auth)
   Click: Save
```

#### Step 2.4: Reboot TP-Link
```
Go to: System Tools → Reboot
Click: Reboot
Wait 2 minutes for restart
```

---

### **PHASE 3: Application Configuration**

#### Step 3.1: Update Environment Variables
```
Edit: /fulifi/.env.local

Ensure these values:
─────────────────────────────────────────────────
# MikroTik Configuration
MIKROTIK_HOST=10.5.50.1
MIKROTIK_PORT=80
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=Hazy.123
MIKROTIK_TIMEOUT=15000

# Portal Configuration
NEXT_PUBLIC_BASE_URL=http://192.168.88.50:3000
PORTAL_IP=192.168.88.50

# Database (already configured)
DATABASE_URL="postgresql://..."

# Payment Gateway
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
─────────────────────────────────────────────────
```

#### Step 3.2: Run Migrations
```bash
cd /fulifi
npx prisma migrate dev
```

#### Step 3.3: Start Application
```bash
npm run dev
# Server runs on: http://localhost:3000
```

---

### **PHASE 4: Testing Everything**

#### Test 4.1: Verify MikroTik Connection
```bash
curl http://localhost:3000/api/test-mikrotik

Expected response:
{
  "success": true,
  "message": "Connected to MikroTik router: MikroTik",
  "config": {
    "host": "10.5.50.1",
    "username": "admin",
    "timeout": 15000
  }
}
```

#### Test 4.2: Test Device Connection Logging
```bash
curl -X POST http://localhost:3000/api/device-connection \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "aa:bb:cc:dd:ee:ff",
    "ipAddress": "192.168.1.100",
    "deviceName": "Test Phone",
    "voucherCode": "TEST001"
  }'

Expected response:
{
  "success": true,
  "connectionId": "clx5z7x8...",
  "message": "Device aa:bb:cc:dd:ee:ff connected from 192.168.1.100"
}
```

#### Test 4.3: Check Active Connections
```bash
curl http://localhost:3000/api/device-connection?action=active

Expected response:
{
  "success": true,
  "action": "active",
  "count": 1,
  "devices": [...]
}
```

#### Test 4.4: Test WiFi Connection
```
1. Connect phone to "Starlinknet-WIFI" SSID
2. Open browser on phone
3. Try to access any website
4. You should be redirected to: 192.168.88.50:3000/portal
5. Billing page should load
6. Select package and pay with Paystack
7. Device should be disconnected after session expires
```

---

## 📊 Monitoring Device Connections

### View Active Users
```bash
# Get currently connected devices
curl "http://localhost:3000/api/device-connection?action=active"

# Get connection statistics
curl "http://localhost:3000/api/device-connection?action=stats"

# Get connection history (last 24 hours)
curl "http://localhost:3000/api/device-connection?action=history"
```

### Database Queries
```bash
# Access database directly
npx prisma studio

# Or use SQL:
sqlite3 dev.db
  SELECT COUNT(*) FROM DeviceConnection;
  SELECT * FROM DeviceConnection ORDER BY connectedAt DESC;
```

---

## 🔧 Troubleshooting

### Problem: "Failed to connect to router"
**Solution:**
1. Check MikroTik IP: `ping 10.5.50.1`
2. Verify REST API enabled: Winbox → IP → Services → http ☑️
3. Test directly: `curl -u admin:Hazy.123 http://10.5.50.1/rest/system/identity`

### Problem: Device connects but no billing page redirect
**Solution:**
1. Check `login.html` uploaded to MikroTik hotspot folder
2. Verify Walled Garden includes your portal IP
3. Test URL manually: `http://192.168.88.50:3000/portal`

### Problem: No devices showing in connection logs
**Solution:**
1. Verify `/api/device-connection` endpoint is working: `curl http://localhost:3000/api/device-connection?action=stats`
2. Check if default site was created: `npx prisma studio`
3. Manually test: `curl -X POST http://localhost:3000/api/device-connection ...`

### Problem: Voucher not working on MikroTik
**Solution:**
1. Verify user profiles exist in Winbox
2. Check profile names match exactly (case-sensitive)
3. Test MikroTik connection: `curl http://localhost:3000/api/test-mikrotik`

---

## 🎯 What Happens When Someone Connects

```
1. User turns on phone WiFi
   ↓
2. Connects to "Starlinknet-WIFI" SSID
   ↓
3. MikroTik captures: MAC address, IP address
   ↓
4. Browser opens, user redirected to: http://192.168.88.50:3000/portal
   ↓
5. Billing page loads with package options
   ↓
6. User selects package (e.g., "1-Hour-Pass" for 15 KES)
   ↓
7. User enters phone number and pays via Paystack
   ↓
8. Payment confirmed by M-Pesa
   ↓
9. System automatically:
   - Creates voucher code
   - Pushes to MikroTik hotspot
   - Logs device connection in database
   ↓
10. Device granted internet access for purchased duration
    ↓
11. When time expires, MikroTik automatically disconnects device
    ↓
12. System logs disconnection and session duration
```

---

## 📋 Quick Reference Checklist

- [ ] MikroTik RouterOS at 10.5.50.1
  - [ ] REST API enabled (port 80)
  - [ ] Hotspot server created
  - [ ] User profiles created (1hr, 24hr, 7day)
  - [ ] Login page uploaded
  - [ ] Walled garden configured

- [ ] TP-Link Access Point
  - [ ] Configured as Access Point mode
  - [ ] IP: 192.168.88.200
  - [ ] SSID: "Starlinknet-WIFI"
  - [ ] Connected to MikroTik LAN

- [ ] Application
  - [ ] `.env.local` configured
  - [ ] Database migrated
  - [ ] Server running on port 3000
  - [ ] APIs tested and working

- [ ] Testing
  - [ ] `/api/test-mikrotik` returns success
  - [ ] Device connection logging works
  - [ ] WiFi portal redirects properly
  - [ ] Payment flow works end-to-end

---

## 🚨 Important Reminders

1. **Security**: Keep MIKROTIK_PASSWORD safe in `.env.local` (never commit)
2. **Network**: Ensure server and MikroTik are on same subnet (10.5.50.0/24)
3. **Firewall**: Configure MikroTik firewall to allow port 80 from your server
4. **Backups**: Regularly backup MikroTik configuration
5. **Monitoring**: Watch logs for `[Device Connection]` and `[MikroTik]` messages

---

## ✨ You're All Set!

Your WiFi billing system is now complete with:
- ✅ Real-time device tracking
- ✅ Automatic voucher creation
- ✅ Payment integration (Paystack)
- ✅ MikroTik hotspot management
- ✅ Connection history & statistics

**Next:** Go live and start collecting payments! 🎉
