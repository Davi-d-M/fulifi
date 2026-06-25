# Device Connection Tracking - Complete Setup Guide

This guide explains how to track when devices connect/disconnect from your WiFi hotspot and view them in real-time.

## Overview

The system now tracks:
- ✅ When a device connects to WiFi
- ✅ Device MAC address & IP address
- ✅ Voucher code used (if any)
- ✅ Session duration
- ✅ When device disconnects
- ✅ Real-time dashboard of active connections

---

## Architecture

```
MikroTik Hotspot → POST /api/device-connection → Database → Admin Dashboard
                                                 ↓
                                         Track active devices
                                         History & Statistics
```

---

## How It Works

### 1. Device Connects to WiFi
- User connects phone to "Starlinknet-WIFI" SSID
- MikroTik captures: MAC address, IP address
- System logs connection: `POST /api/device-connection`

### 2. Connection is Logged
- Record saved to `DeviceConnection` table
- Timestamp: `connectedAt`
- Status: `CONNECTED`

### 3. Device Disconnects
- MikroTik detects logout
- System marks as disconnected: `PUT /api/device-connection`
- Timestamp: `disconnectedAt`
- Duration calculated automatically

### 4. Admin Views Dashboard
- Real-time list of who's connected
- Statistics: total, active, expired devices
- Connection history (last 24 hours)

---

## API Endpoints

### **POST /api/device-connection**
Log when a device connects.

**Request:**
```bash
curl -X POST http://localhost:3000/api/device-connection \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "aa:bb:cc:dd:ee:ff",
    "ipAddress": "192.168.1.100",
    "deviceName": "iPhone 13",
    "voucherCode": "ABC123XYZ",
    "siteId": "default-site"
  }'
```

**Response:**
```json
{
  "success": true,
  "connectionId": "clx5z7x8y9z0a1b2c3d4e5f6g",
  "message": "Device aa:bb:cc:dd:ee:ff connected from 192.168.1.100",
  "timestamp": "2026-06-23T20:15:00Z"
}
```

---

### **GET /api/device-connection?action=active**
Get currently active connections.

**Request:**
```bash
curl "http://localhost:3000/api/device-connection?action=active&limit=50"
```

**Response:**
```json
{
  "success": true,
  "action": "active",
  "count": 5,
  "devices": [
    {
      "id": "clx5z7x8y9z0a1b2c3d4e5f6g",
      "macAddress": "aa:bb:cc:dd:ee:ff",
      "ipAddress": "192.168.1.100",
      "deviceName": "iPhone 13",
      "voucherCode": "ABC123XYZ",
      "connectedAt": "2026-06-23T20:10:00Z",
      "status": "CONNECTED"
    }
  ]
}
```

---

### **GET /api/device-connection?action=history**
Get connection history (last 24 hours).

**Request:**
```bash
curl "http://localhost:3000/api/device-connection?action=history&limit=100"
```

**Response:**
```json
{
  "success": true,
  "action": "history",
  "count": 23,
  "devices": [...]
}
```

---

### **GET /api/device-connection?action=stats**
Get connection statistics.

**Request:**
```bash
curl "http://localhost:3000/api/device-connection?action=stats"
```

**Response:**
```json
{
  "success": true,
  "action": "stats",
  "totalConnections": 150,
  "activeConnections": 5,
  "disconnectedConnections": 140,
  "expiredConnections": 5,
  "firstConnection": "2026-06-20T08:00:00Z",
  "lastConnection": "2026-06-23T20:15:00Z"
}
```

---

### **PUT /api/device-connection**
Mark a device as disconnected.

**Request:**
```bash
curl -X PUT http://localhost:3000/api/device-connection \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "aa:bb:cc:dd:ee:ff",
    "status": "DISCONNECTED"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Device aa:bb:cc:dd:ee:ff marked as DISCONNECTED",
  "sessionDuration": 1850,
  "disconnectionTime": "2026-06-23T20:35:00Z"
}
```

---

## Integration with MikroTik

### Option 1: Automatic via Hotspot Scripts (Recommended)

1. In MikroTik Winbox, go to **IP → Hotspot → Server Profiles**
2. Double-click your profile → **Scripts** tab
3. Add this script to **On Login**:

```bash
{
  local mac $"mac-address";
  local ip $"address";
  local user $"user";
  
  :do {
    /tool fetch url="http://YOUR_PORTAL_IP:3000/api/device-connection" mode=http \
      http-method=post \
      http-data="{\"macAddress\":\"$mac\",\"ipAddress\":\"$ip\",\"voucherCode\":\"$user\",\"deviceName\":\"MikroTik-Session\"}" \
      http-header-field="Content-Type: application/json"
  } on-error={ :log error "FULIFI: Failed to log connection for $user" }
}
```

4. Add this script to **On Logout**:

```bash
{
  local mac $"mac-address";
  local ip $"address";
  
  :do {
    /tool fetch url="http://YOUR_PORTAL_IP:3000/api/device-connection" mode=http \
      http-method=put \
      http-data="{\"macAddress\":\"$mac\",\"ipAddress\":\"$ip\",\"status\":\"DISCONNECTED\"}" \
      http-header-field="Content-Type: application/json"
  } on-error={ :log error "FULIFI: Failed to log disconnect for $mac" }
}
```

### Option 2: Via WhatsApp/Admin Webhook

When your portal receives a payment:
1. Payment confirmed
2. System sends: `POST /api/device-connection` with voucher code
3. Device logged in system

### Option 3: Manual Monitoring Script

Create a cron job to check MikroTik active users:

```bash
# Run every 5 minutes
*/5 * * * * /root/sync-mikrotik-users.sh
```

**sync-mikrotik-users.sh:**
```bash
#!/bin/bash
PORTAL="http://192.168.88.50:3000"

# Get active users from MikroTik
curl -s -u admin:password http://10.5.50.1/rest/ip/hotspot/active \
  | jq '.[] | {mac: .mac-address, ip: .address, name: .user}' \
  | while read line; do
    MAC=$(echo $line | jq -r '.mac')
    IP=$(echo $line | jq -r '.ip')
    NAME=$(echo $line | jq -r '.name')
    
    # Log to portal
    curl -X POST $PORTAL/api/device-connection \
      -d "macAddress=$MAC&ipAddress=$IP&deviceName=$NAME"
  done
```

---

## Admin Dashboard Integration

Add to your admin page (`/admin/dashboard`):

```tsx
'use client';
import { useEffect, useState } from 'react';

export default function ActiveDevices() {
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Fetch active connections
    fetch('/api/device-connection?action=active')
      .then(r => r.json())
      .then(d => setDevices(d.devices));

    // Fetch statistics
    fetch('/api/device-connection?action=stats')
      .then(r => r.json())
      .then(s => setStats(s));

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetch('/api/device-connection?action=active')
        .then(r => r.json())
        .then(d => setDevices(d.devices));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">🔴 Active Connections</h2>
      
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold">{stats.totalConnections}</p>
          </div>
          <div className="bg-green-100 p-4 rounded">
            <p className="text-sm text-gray-600">Active Now</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeConnections}</p>
          </div>
          <div className="bg-yellow-100 p-4 rounded">
            <p className="text-sm text-gray-600">Disconnected</p>
            <p className="text-2xl font-bold">{stats.disconnectedConnections}</p>
          </div>
          <div className="bg-red-100 p-4 rounded">
            <p className="text-sm text-gray-600">Expired</p>
            <p className="text-2xl font-bold text-red-600">{stats.expiredConnections}</p>
          </div>
        </div>
      )}

      <table className="w-full border">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 text-left">MAC Address</th>
            <th className="p-2 text-left">IP Address</th>
            <th className="p-2 text-left">Device</th>
            <th className="p-2 text-left">Voucher</th>
            <th className="p-2 text-left">Connected</th>
          </tr>
        </thead>
        <tbody>
          {devices.map(d => (
            <tr key={d.id} className="border-t">
              <td className="p-2">{d.macAddress}</td>
              <td className="p-2">{d.ipAddress}</td>
              <td className="p-2">{d.deviceName}</td>
              <td className="p-2">{d.voucherCode || '—'}</td>
              <td className="p-2">{new Date(d.connectedAt).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Database Schema

```sql
model DeviceConnection {
   id            String    @id @default(cuid())
   macAddress    String
   ipAddress     String
   deviceName    String?
   voucherCode   String?
   status        String    @default("CONNECTED")
   connectedAt   DateTime  @default(now())
   disconnectedAt DateTime?
   sessionDuration Int?
   dataUsed      Float?
   siteId        String    @default("default-site")
   site          Site      @relation(fields: [siteId], references: [id])

   @@index([macAddress])
   @@index([ipAddress])
   @@index([voucherCode])
   @@index([connectedAt])
}
```

---

## Testing

### 1. Test Connection Logging
```bash
curl -X POST http://localhost:3000/api/device-connection \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "aa:bb:cc:dd:ee:ff",
    "ipAddress": "192.168.1.100",
    "deviceName": "Test Phone",
    "voucherCode": "TEST001"
  }'
```

### 2. Check Active Connections
```bash
curl http://localhost:3000/api/device-connection?action=active
```

### 3. Get Statistics
```bash
curl http://localhost:3000/api/device-connection?action=stats
```

### 4. Disconnect Device
```bash
curl -X PUT http://localhost:3000/api/device-connection \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "aa:bb:cc:dd:ee:ff",
    "status": "DISCONNECTED"
  }'
```

---

## Troubleshooting

### No devices showing up?

1. **Check API is accessible:**
   ```bash
   curl http://localhost:3000/api/device-connection?action=stats
   ```

2. **Verify MikroTik is sending data:**
   - Check server logs for `[Device Connection]` entries

3. **Check database:**
   ```bash
   sqlite3 dev.db "SELECT COUNT(*) FROM DeviceConnection;"
   ```

### Real-time updates not showing?

- Add polling interval (default: 30 seconds)
- Consider WebSocket for instant updates
- Check browser console for fetch errors

---

## Next Steps

1. ✅ Database schema ready (DeviceConnection table)
2. ✅ API endpoints ready (POST/GET/PUT)
3. Next: Integrate MikroTik hotspot hooks
4. Next: Add admin dashboard widget
5. Next: Set up real-time alerts (optional)

---

## Support

For issues:
1. Check logs: `tail -f server.log | grep "Device Connection"`
2. Test API: `curl http://localhost:3000/api/device-connection?action=stats`
3. Verify database: `npx prisma studio`
