# 🔌 NEW APIS - Quick Reference

## 📊 Analytics API

**Get Revenue This Week:**
```bash
curl "http://localhost:3000/api/analytics?action=week"
```

**Response:**
```json
{
  "metrics": {
    "totalRevenue": 5250.50,
    "totalSessions": 145,
    "uniqueDevices": 98,
    "activeUsers": 12,
    "averageSessionDuration": 2150
  }
}
```

---

## 🚫 Blacklist API

**Ban a Device:**
```bash
curl -X POST http://localhost:3000/api/device-blacklist \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress":"aa:bb:cc:dd:ee:ff",
    "reason":"High bandwidth abuse",
    "severity":"HIGH",
    "bannedBy":"admin"
  }'
```

**Get All Banned Devices:**
```bash
curl "http://localhost:3000/api/device-blacklist"
```

**Unban Device:**
```bash
curl -X DELETE http://localhost:3000/api/device-blacklist \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"aa:bb:cc:dd:ee:ff"}'
```

---

## ✅ Whitelist API

**Whitelist a Device:**
```bash
curl -X POST http://localhost:3000/api/device-whitelist \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress":"11:22:33:44:55:66",
    "name":"Admin Laptop",
    "createdBy":"admin"
  }'
```

**Get Whitelisted Devices:**
```bash
curl "http://localhost:3000/api/device-whitelist"
```

**Remove from Whitelist:**
```bash
curl -X DELETE http://localhost:3000/api/device-whitelist \
  -H "Content-Type: application/json" \
  -d '{"macAddress":"11:22:33:44:55:66"}'
```

---

## 🚨 Alerts API

**Create Alert:**
```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "type":"ROUTER_DOWN",
    "severity":"CRITICAL",
    "title":"Router Offline",
    "message":"MikroTik not responding"
  }'
```

**Get Unread Alerts:**
```bash
curl "http://localhost:3000/api/alerts?filter=unread&limit=10"
```

**Get Critical Alerts:**
```bash
curl "http://localhost:3000/api/alerts?filter=critical"
```

**Mark Alert as Read:**
```bash
curl -X PUT http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"alertId":"clx5z7x8..."}'
```

---

## 📱 Device Profiling API

**Update Device Profile:**
```bash
curl -X POST http://localhost:3000/api/device-profiling \
  -H "Content-Type: application/json" \
  -d '{
    "macAddress":"aa:bb:cc:dd:ee:ff",
    "deviceType":"iOS",
    "browserType":"Safari",
    "osVersion":"17.0"
  }'
```

**Get Top Spending Devices:**
```bash
curl "http://localhost:3000/api/device-profiling?sortBy=totalSpent&limit=10"
```

**Get Device Types Breakdown:**
```bash
curl "http://localhost:3000/api/device-profiling" | jq '.byDeviceType'
```

---

## 💾 Revenue Export API

**Export Today as CSV:**
```bash
curl "http://localhost:3000/api/revenue-export?format=csv&period=today" > revenue.csv
```

**Export Week as JSON:**
```bash
curl "http://localhost:3000/api/revenue-export?format=json&period=week"
```

**Export Custom Date Range:**
```bash
curl "http://localhost:3000/api/revenue-export?format=csv&period=custom&startDate=2026-06-01&endDate=2026-06-30"
```

**Response (JSON):**
```json
{
  "summary": {
    "totalTransactions": 42,
    "totalRevenue": 5250.50,
    "totalSessions": 145,
    "uniqueDevices": 98
  },
  "transactions": [
    {
      "date": "2026-06-23T14:30:00Z",
      "transactionRef": "STK123456",
      "amount": 125.00,
      "voucherCode": "ABC123XYZ",
      "package": "1-Hour-Pass",
      "status": "active"
    }
  ]
}
```

---

## 🎯 Common Use Cases

### Use Case 1: Check Today's Revenue
```bash
curl "http://localhost:3000/api/analytics?action=today" | jq '.metrics.totalRevenue'
```

### Use Case 2: See How Many Active Users
```bash
curl "http://localhost:3000/api/analytics?action=today" | jq '.metrics.activeUsers'
```

### Use Case 3: Ban Spammer
```bash
curl -X POST http://localhost:3000/api/device-blacklist \
  -d '{"macAddress":"aa:bb:cc:dd:ee:ff","reason":"Spam traffic","severity":"HIGH","bannedBy":"admin"}' \
  -H "Content-Type: application/json"
```

### Use Case 4: Create Daily Revenue Report
```bash
curl "http://localhost:3000/api/revenue-export?format=json&period=today" > /backups/revenue-$(date +%Y-%m-%d).json
```

### Use Case 5: Get Device Statistics
```bash
curl "http://localhost:3000/api/device-profiling?limit=50" | jq '.byDeviceType'
```

---

## 🔄 JavaScript Examples

### Get Analytics in React
```jsx
const [analytics, setAnalytics] = useState(null);

useEffect(() => {
  fetch('/api/analytics?action=today')
    .then(r => r.json())
    .then(data => setAnalytics(data.metrics));
}, []);

return <div>Revenue: KES {analytics?.totalRevenue}</div>;
```

### Ban Device in Admin UI
```jsx
async function banDevice(macAddress, reason) {
  const res = await fetch('/api/device-blacklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      macAddress,
      reason,
      severity: 'HIGH',
      bannedBy: 'admin'
    })
  });
  return res.json();
}
```

### Download Revenue Report
```jsx
async function downloadReport(period) {
  const res = await fetch(`/api/revenue-export?format=csv&period=${period}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `revenue-${period}.csv`;
  a.click();
}
```

---

## 📊 Query Parameters Reference

| API | Parameters | Example |
|-----|-----------|---------|
| analytics | action, siteId | ?action=week&siteId=default-site |
| blacklist | siteId, limit | ?siteId=default-site |
| whitelist | siteId, limit | ?siteId=default-site |
| alerts | filter, limit, siteId | ?filter=unread&limit=10 |
| profiling | sortBy, limit, siteId | ?sortBy=totalSpent&limit=50 |
| export | format, period, startDate, endDate | ?format=csv&period=today |

---

## ✨ That's It!

All 6 features are ready to use. Pick any endpoint above and start integrating into your admin dashboard!
