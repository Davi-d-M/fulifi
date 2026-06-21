# Starlinknet.WIFI Operational Checklist (Bulletproof Setup)

To ensure your MikroTik hotspot billing system is foolproof and professional, follow these networking and infrastructure steps:

## 1. Static Public IP or Dynamic DNS (DDNS)
Your Next.js server (e.g., on Vercel) needs to reach your local router.
*   **On MikroTik**: Enable built-in DDNS:
    ```bash
    /ip cloud set ddns-enabled=yes
    /ip cloud print
    ```
*   Use the `dns-name` provided as your `MIKROTIK_HOST` in `.env.local`.

## 2. Router Firewall Port Whitelisting
Do NOT open port 8728 to everyone.
*   Find the IP address of your production server.
*   **On MikroTik**: Add a rule to allow ONLY that IP:
    ```bash
    /ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address=[YOUR_SERVER_IP] action=accept comment="Allow Starlinknet.WIFI API"
    /ip firewall filter add chain=input protocol=tcp dst-port=8728 action=drop comment="Drop other API traffic"
    ```

## 3. Walled Garden (M-Pesa & Portal)
Allow users to pay before they are authenticated.
*   Add these domains to `/ip hotspot walled-garden`:
    *   `*.safaricom.co.ke` (For M-Pesa STK Push)
    *   `yourdomain.com` (Your payment portal)
    *   `*.gstatic.com`, `*.googleapis.com` (Common UI dependencies)

## 4. Automated Expiration (Cron Job)
The system now has a cron route at `/api/cron/expire-users`.
*   Set up a Cron service (like **Vercel Cron**, **GitHub Actions**, or **Cron-job.org**) to hit this URL every 1 minute.
*   **Method**: `GET`
*   **Headers**: `Authorization: Bearer [YOUR_CRON_SECRET]`
*   This ensures users are kicked off the second their time runs out.

## 5. M-Pesa Callback URL
Ensure Safaricom Daraja is configured to send callbacks to:
`https://yourdomain.com/api/callback`

## 6. Database Safety
Run prisma migrations after any schema changes:
```bash
npx prisma migrate dev --name init_advanced_features
```

Your system is now technically complete with live tracking, automated kicking, and bulk voucher support!
