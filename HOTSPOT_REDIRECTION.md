# MikroTik Hotspot Redirection Setup

To ensure that users are automatically redirected to your billing portal when they connect to the WiFi, follow these steps:

## 1. Configure the Hotspot Server

In Winbox:
1. Go to **IP → Hotspot**.
2. Click **Hotspot Setup** and follow the wizard for your bridge/interface.
3. In **Server Profiles**, double-click your profile (e.g., `hsprof1`).
4. Go to the **Login** tab:
   - Check **HTTP PAP**.
   - (Optional) Check **MAC Cookie** if you want users to stay logged in.

## 2. Upload the Redirection Script

You need to modify the `login.html` file on the MikroTik router so it sends users to your Next.js portal.

1. Create a file on your computer named `login.html`.
2. Paste the following code into it:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Redirecting...</title>
    <meta http-equiv="refresh" content="0; url=http://YOUR_SERVER_IP_OR_DOMAIN?mac=$(mac)&ip=$(ip)&link-login=$(link-login-only)&link-orig=$(link-orig)">
    <meta http-equiv="pragma" content="no-cache">
    <meta http-equiv="expires" content="-1">
</head>
<body>
    <p>If you are not redirected, <a href="http://YOUR_SERVER_IP_OR_DOMAIN?mac=$(mac)&ip=$(ip)&link-login=$(link-login-only)&link-orig=$(link-orig)">click here</a>.</p>
</body>
</html>
```

3. Replace `YOUR_SERVER_IP_OR_DOMAIN` with the actual address of your Starlinknet.WIFI portal (e.g., `192.168.88.50:3000` or `wifi.yourdomain.com`).
4. In Winbox, go to **Files**.
5. Find the `hotspot` folder.
6. Drag and drop your new `login.html` into the `hotspot` folder, overwriting the old one.

## 3. Configure the Walled Garden

Users must be able to reach your portal and Paystack before they are authenticated.

In Winbox:
1. Go to **IP → Hotspot → Walled Garden**.
2. Click **+** to add new entries (Action: allow):
   - **Dst. Host:** `YOUR_SERVER_IP_OR_DOMAIN`
   - **Dst. Host:** `*.paystack.com`
   - **Dst. Host:** `*.paystack.co`
   - **Dst. Host:** `*.green-api.com` (for WhatsApp alerts)
   - **Dst. Host:** `*.google.com` (optional, for fonts/icons)

## 4. Test the Redirection

1. Connect a phone to the WiFi.
2. A "Sign in to network" notification should appear.
3. Clicking it should open your Starlinknet.WIFI portal with the bundle selection and voucher input.
4. The URL should automatically contain the `mac` and `ip` parameters from the router.

---

**Note:** If you are using a local server IP (like `192.168.88.50`), ensure the router and the server are on the same subnet and can communicate.
