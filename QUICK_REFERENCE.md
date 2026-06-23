# 🚀 QUICK REFERENCE - Device Tracking & Real-Time Monitoring

## What You Have

✅ **Device Connection Tracking API**
- Know instantly when someone connects to WiFi
- See real-time list of active users
- Track session duration
- View 24-hour history

---

## API Endpoints (Copy-Paste Ready)

### 1. Log a Device Connection
```bash
curl -X POST http://localhost:3000/api/device-connection \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress": "aa:bb:cc:dd:ee:ff",
    "ipAddress": "192.168.1.100",
    "deviceName": "iPhone 13",
    "voucherCode": "ABC123XYZ"
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

### 2. Get Active Connections (WHO'S CONNECTED NOW)
```bash
curl "http://localhost:3000/api/device-connection?action=active&limit=50"
```

**Response:**
```json
{
  "success": true,
  "action": "active",
  "count": 3,
  "devices": [
    {
      "id": "clx5z7x8y9z0a1b2c3d4e5f6g",
      "macAddress": "aa:bb:cc:dd:ee:ff",
      "ipAddress": "192.168.1.100",
      "deviceName": "iPhone 13",
      "voucherCode": "ABC123XYZ",
      "connectedAt": "2026-06-23T14:30:00Z",
      "status": "CONNECTED"
    }
  ]
}
```

---

### 3. Get Statistics (Dashboard Numbers)
```bash
curl "http://localhost:3000/api/device-connection?action=stats"
```

**Response:**
```json
{
  "success": true,
  "action": "stats",
  "totalConnections": 150,
  "activeConnections": 3,
  "disconnectedConnections": 140,
  "expiredConnections": 7,
  "firstConnection": "2026-06-20T08:00:00Z",
  "lastConnection": "2026-06-23T20:15:00Z"
}
```

---

### 4. Get Connection History (Last 24 Hours)
```bash
curl "http://localhost:3000/api/device-connection?action=history&limit=100"
```

**Response:**
```json
{
  "success": true,
  "action": "history",
  "count": 45,
  "devices": [...]
}
```

---

### 5. Log Device Disconnection
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

## MikroTik Integration Checklist

### Before Testing
- [ ] `MIKROTIK_HOST=10.5.50.1` in `.env.local`
- [ ] `MIKROTIK_USER=admin` in `.env.local`
- [ ] `MIKROTIK_PASSWORD=Hazy.123` in `.env.local`
- [ ] REST API enabled on MikroTik (port 80)
- [ ] User profiles created (1hr, 24hr, 7day)
- [ ] Custom `login.html` uploaded
- [ ] Walled Garden configured

### Test MikroTik Connection
```bash
curl http://localhost:3000/api/test-mikrotik
```

---

## Real-Time Monitoring Dashboard

Use this code to display active users:

```jsx
'use client';
import { useEffect, useState } from 'react';

export default function ActiveUsers() {
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const refresh = async () => {
      // Get active connections
      const res1 = await fetch('/api/device-connection?action=active');
      const data1 = await res1.json();
      setDevices(data1.devices);

      // Get stats
      const res2 = await fetch('/api/device-connection?action=stats');
      const data2 = await res2.json();
      setStats(data2);
    };

    refresh();
    const interval = setInterval(refresh, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">🔴 Active Now: {stats?.activeConnections || 0}</h2>
      
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2">MAC Address</th>
            <th className="p-2">IP</th>
            <th className="p-2">Device</th>
            <th className="p-2">Voucher</th>
            <th className="p-2">Connected</th>
          </tr>
        </thead>
        <tbody>
          {devices.map(d => (
            <tr key={d.id} className="border-t">
              <td className="p-2 font-mono text-sm">{d.macAddress}</td>
              <td className="p-2">{d.ipAddress}</td>
              <td className="p-2">{d.deviceName}</td>
              <td className="p-2 font-bold text-green-600">{d.voucherCode}</td>
              <td className="p-2 text-sm">{new Date(d.connectedAt).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="bg-green-100 p-4 rounded text-center">
          <p className="text-sm">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats?.activeConnections || 0}</p>
        </div>
        <div className="bg-blue-100 p-4 rounded text-center">
          <p className="text-sm">Total</p>
          <p className="text-2xl font-bold">{stats?.totalConnections || 0}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded text-center">
          <p className="text-sm">Disconnected</p>
          <p className="text-2xl font-bold">{stats?.disconnectedConnections || 0}</p>
        </div>
        <div className="bg-red-100 p-4 rounded text-center">
          <p className="text-sm">Expired</p>
          <p className="text-2xl font-bold text-red-600">{stats?.expiredConnections || 0}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## Database Query Examples

### See all active connections
```bash
npx prisma studio
# Browse to DeviceConnection table
# Filter: status = "CONNECTED" AND disconnectedAt = null
```

### Or use SQL directly
```bash
sqlite3 dev.db
  SELECT macAddress, ipAddress, deviceName, voucherCode, connectedAt 
  FROM DeviceConnection 
  WHERE status = 'CONNECTED';
```

---

## Flow: When Someone Connects

```
1. User connects to "Starlinknet-WIFI" WiFi
   └─ MikroTik captures MAC + IP

2. User's browser redirects to billing portal
   └─ http://192.168.88.50:3000/portal?mac=aa:bb:cc:dd:ee:ff&ip=192.168.1.100

3. User selects package & pays via Paystack
   └─ "1-Hour-Pass" - 15 KES

4. Payment confirmed by M-Pesa
   └─ System auto-creates voucher: ABC123XYZ

5. System logs device connection
   └─ POST /api/device-connection
   └─ Recorded: MAC, IP, device name, voucher

6. Check active users
   └─ GET /api/device-connection?action=active
   └─ Device shows as CONNECTED

7. User browses internet for 1 hour

8. Session expires (time runs out)
   └─ MikroTik auto-disconnects device

9. System logs disconnection
   └─ PUT /api/device-connection
   └─ Duration calculated: 3600 seconds
   └─ Device moved to history
```

---

## Error Codes & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| 400 Bad Request | Missing macAddress or ipAddress | Include both fields in POST/PUT |
| 404 Not Found | Device not found for disconnect | Verify MAC address is correct |
| 500 Internal Server Error | Foreign key error | Run `/api/test-db` to init site |
| Blank response | Server not running | `npm run dev` in `/fulifi` directory |

---

## Useful URLs

```
Development Server:     http://localhost:3000
Admin Dashboard:        http://localhost:3000/admin
API Test:              http://localhost:3000/api/test-mikrotik
Prisma Studio:         npx prisma studio
Database:              dev.db (SQLite)
```

---

## Verify Everything Works

```bash
# 1. Start server
cd fulifi && npm run dev

# 2. Init database (first time only)
curl http://localhost:3000/api/test-db

# 3. Test stats
curl http://localhost:3000/api/device-connection?action=stats

# 4. Log test device
curl -X POST http://localhost:3000/api/device-connection \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"aa:bb:cc:dd:ee:ff","ipAddress":"192.168.1.100"}'

# 5. Check active devices
curl http://localhost:3000/api/device-connection?action=active

# 6. Disconnect device
curl -X PUT http://localhost:3000/api/device-connection \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"aa:bb:cc:dd:ee:ff"}'
```

---

## You're Ready! 🎉

Your system now:
- ✅ Tracks when devices connect
- ✅ Shows real-time active users
- ✅ Records session duration
- ✅ Integrates with MikroTik
- ✅ Links to payment system
- ✅ Generates reports

**Next Step**: Configure MikroTik (see COMPLETE_SETUP_GUIDE.md)
