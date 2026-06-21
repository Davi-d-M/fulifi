# Time-Based Access Control - How It Works

## Overview

When a customer pays and the payment is confirmed, they can **ONLY** access the internet for the exact duration they purchased. After that time expires, they are automatically disconnected.

## How Time-Based Access is Enforced

### 1. **MikroTik Profile Duration**
Each package maps to a MikroTik User Profile that has a specific time limit:

| Package | Duration | Speed | MikroTik Profile |
|---------|----------|-------|------------------|
| 1 Hour Standard | 1 hour | 5 Mbps | `1-Hour-Pass` |
| 24 Hour Day Pass | 24 hours | 8 Mbps | `24-Hour-Pass` |
| 7 Days Weekly | 7 days | 10 Mbps | `7-Day-Pass` |
| ⚡ Power Hour | 1 hour | 15 Mbps | `1-Hour-Pass` |
| 💼 Quick Access | **3 hours** | 8 Mbps | `3-Hour-Pass` |
| 🎬 Netflix Special | 4 hours | 3 Mbps | `Netflix-Special` |
| 💻 Work Mode | **6 hours** | 10 Mbps | `Work-Mode-Pass` |
| 🌙 Night Owl | 6 hours | 12 Mbps | `6-Hour-Pass` |
| 🌃 Midnight Oil SUPER FAST | **5 hours** | **20 Mbps** | `Midnight-Oil-SUPER-FAST` |
| 🎉 Weekend Binge | 48 hours | 10 Mbps | `48-Hour-Pass` |

### 2. **Payment Flow**

```
Customer Pays (M-Pesa)
        ↓
M-Pesa Confirmation Received
        ↓
Generate Voucher Code (e.g., "ABC123XYZ")
        ↓
Save to Database with Duration (e.g., 3 hours for Quick Access)
        ↓
Push to MikroTik with Specific Profile
        ↓
MikroTik Creates Hotspot User with Profile
        ↓
Profile Enforces Time Limit (3 hours)
        ↓
Customer Can Login with Voucher Code
        ↓
After 3 Hours: Automatic Disconnection (Session Expires)
```

### 3. **Time Enforcement Mechanism**

In **Winbox → IP → Hotspot → User Profiles**, each profile has a **Cookie Timeout** setting:

- This setting defines how long a user can stay connected
- When time expires, MikroTik forcefully disconnects the session
- Customer MUST buy another voucher to reconnect

### 4. **Current Updated Packages**

#### New Additions:
1. **💼 Quick Access** - 3 hours @ **25 KES**
   - Perfect for quick browsing
   - 8 Mbps speed
   - Profile: `3-Hour-Pass`

2. **💻 Work Mode** - 6 hours @ **40 KES**
   - Full productivity package
   - 10 Mbps speed
   - Profile: `Work-Mode-Pass`

#### Updated:
3. **🌃 Midnight Oil SUPER FAST** - Changed from 25 KES to **45 KES**
   - Now includes "SUPER FAST" label
   - 20 Mbps speed (increased from 5 Mbps)
   - Profile: `Midnight-Oil-SUPER-FAST`

## Router Configuration Required

To enforce time-based access, create these profiles in **Winbox → IP → Hotspot → User Profiles**:

### Quick Access Profile (3 hours)
```
Name: 3-Hour-Pass
Shared Users: 1
Rate Limit: 8 Mbps down / 8 Mbps up
Cookie Timeout: 3h (180 minutes)
Idle Timeout: 10m
Data Limit: Unlimited
```

### Work Mode Profile (6 hours)
```
Name: Work-Mode-Pass
Shared Users: 1
Rate Limit: 10 Mbps down / 10 Mbps up
Cookie Timeout: 6h (360 minutes)
Idle Timeout: 15m
Data Limit: Unlimited
```

### Midnight Oil SUPER FAST Profile (5 hours)
```
Name: Midnight-Oil-SUPER-FAST
Shared Users: 1
Rate Limit: 20 Mbps down / 20 Mbps up
Cookie Timeout: 5h (300 minutes)
Idle Timeout: 5m
Data Limit: Unlimited
```

### Other Required Profiles
```
1-Hour-Pass (1 hour, 5-15 Mbps)
24-Hour-Pass (24 hours, 8 Mbps)
7-Day-Pass (7 days, 10 Mbps)
6-Hour-Pass (6 hours, 12 Mbps)
Netflix-Special (4 hours, 3 Mbps)
48-Hour-Pass (48 hours, 10 Mbps)
```

## How Disconnection Works

### Automatic Session Timeout
- MikroTik tracks session start time for each voucher
- When Cookie Timeout expires, session ends
- User is kicked off automatically
- Internet access stops immediately

### Example Timeline (Quick Access - 3 hours)

```
14:00 - Customer pays 25 KES
14:05 - Voucher created: "ABC123XYZ"
14:05 - Login to WiFi with code "ABC123XYZ"
14:05 - MikroTik records start time
14:05 - Internet access ENABLED
17:05 - 3 hours elapsed
17:05 - Session timeout triggered
17:05 - Customer DISCONNECTED
17:05 - Must buy new voucher to reconnect
```

## All 10 Packages Now Available

```
STANDARD:
├─ 1 Hour Standard (15 KES)
├─ 24 Hours Day Pass (50 KES)
└─ 7 Days Weekly (250 KES)

OFFERS:
├─ ⚡ Power Hour (10 KES, 1h)
├─ 💼 Quick Access (25 KES, 3h) [NEW]
├─ 🎬 Netflix Special (30 KES, 4h)
├─ 💻 Work Mode (40 KES, 6h) [NEW]
├─ 🌙 Night Owl (30 KES, 6h)
├─ 🌃 Midnight Oil SUPER FAST (45 KES, 5h) [UPDATED]
└─ 🎉 Weekend Binge (100 KES, 48h)
```

## Verification

Test that time-based access is working:

1. **Purchase a voucher** - Use M-Pesa to buy Quick Access (3 hours)
2. **Check database** - Voucher saved with `durationMin: 180`
3. **Check router** - Voucher appears in Winbox Active Users
4. **Check MikroTik profile** - `3-Hour-Pass` profile has `Cookie Timeout: 180m`
5. **Wait 3 hours** - Session automatically terminates
6. **Verify disconnection** - Customer loses internet access

## API Integration

The time-based access is automatically handled:

```typescript
// In payment callback:
1. Duration read from package config (e.g., 3 hours)
2. Saved to database: durationMin = 180
3. MikroTik profile assigned based on duration
4. Profile's Cookie Timeout enforces the limit
5. No manual intervention needed
```

---

**Status**: ✅ Time-based access fully configured
**Ready for**: Deployment with MikroTik setup
