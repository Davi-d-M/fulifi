# Starlinknet.WIFI - WiFi Hotspot Billing System

Starlinknet.WIFI is a mobile-friendly WiFi hotspot billing and access management system built with **Next.js 15**, **Prisma**, and **M-Pesa** payment integration. Users can purchase internet access vouchers via mobile money and automatically access the hotspot.

## Features

- 🔐 **M-Pesa Integration** - STK Push for seamless mobile payments
- 🎫 **Dynamic Voucher Generation** - Auto-generate access codes after payment
- 🌐 **MikroTik Router Integration** - Automatic user provisioning on RouterOS
- 📱 **Mobile-First UI** - Responsive payment form
- 🗄️ **Session Management** - Track active WiFi sessions
- ⚡ **TypeScript** - Full type safety

## Getting Started

### Prerequisites
- Node.js 18+
- MikroTik RouterOS with API enabled
- M-Pesa Safaricom Daraja credentials

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file in the `starlinknet-wifi/` directory:

```env
# M-Pesa Credentials
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_BUSINESS_SHORTCODE=174379
MPESA_PASSKEY=your_passkey

# MikroTik Router
MIKROTIK_HOST=192.168.88.1
MIKROTIK_USER=admin
MIKROTIK_PASSWORD=your_router_password
MIKROTIK_PORT=8728

# Callback URL
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
MPESA_CALLBACK_URL=https://yourdomain.com/api/callback
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the payment form.

## Architecture

### Payment Flow
1. User selects WiFi package and enters phone number
2. Frontend sends request to `/api/pay`
3. Backend validates package and initiates M-Pesa STK Push
4. User enters M-Pesa PIN to confirm payment
5. M-Pesa sends payment confirmation to `/api/callback`
6. Backend creates voucher and provisions MikroTik user
7. Frontend receives token and auto-logs user into hotspot

### Database Models

**Voucher** - WiFi access codes
- `id` - Unique identifier
- `code` - Voucher code
- `durationMin` - Session duration
- `price` - Cost in KES
- `isUsed` - Activation status

**ActiveSession** - User WiFi sessions
- `id` - Session ID
- `macAddress` - Device MAC
- `ipAddress` - Assigned IP
- `voucherCode` - Associated voucher
- `expiresAt` - Expiration time

## API Routes

- `POST /api/pay` - Initiate M-Pesa STK Push
- `POST /api/callback` - Handle M-Pesa payment confirmation

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [M-Pesa Daraja API](https://developer.safaricom.co.ke)
- [MikroTik API Documentation](https://wiki.mikrotik.com/wiki/API)
