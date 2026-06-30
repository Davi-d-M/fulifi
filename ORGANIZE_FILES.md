# MikroTik File Organization Guide

To clean up your router's file list and ensure the captive portal works correctly, run these commands in your **MikroTik Terminal** and then push the file from your **Windows Command Prompt**.

## 1. Cleanup and Prepare Folders (Run in WinBox Terminal)
Copy and paste this into the **New Terminal** in WinBox:

```bash
# Delete the messy folders (replace with actual name if different)
/file remove [find name~"DOCTYPE"]

# Create the correct directory structure inside the flash drive
/file add name=flash/hotspot type=directory

# Verify the hotspot is looking at the flash folder
/ip hotspot profile set [find] html-directory=flash/hotspot
```

## 2. Push the Login File (Run in Windows Command Prompt)
Open a **Command Prompt** (cmd.exe) on your laptop and run this to "push" the fresh design:

```bash
curl -u admin:Hazy.123 -T "C:/Users/hp/Desktop/fulifi/fulifi/public/login.html" ftp://192.168.150.1/flash/hotspot/login.html
```

---

## 🔍 Production Readiness Status

### ✅ MikroTik Connectivity
- **Dual API Support**: Rest (v7+) and Legacy (v6) are both implemented.
- **Dynamic Configuration**: Site-specific IPs and passwords are supported.
- **Walled Garden**: Automatic script for Paystack/Vercel bypass is ready.

### ✅ Internet Control (Flow & Timers)
- **Automatic Provisioning**: Vouchers are created on the router the moment Paystack confirms payment.
- **Uptime Limits**: Router strictly enforces `limit-uptime` based on the package (1HR, 24HR, etc.).
- **Immediate Start**: The session begins the moment the customer logs in via the redirected page.
- **Flow Monitoring**: Live RX/TX traffic monitoring is active on the Admin Panel.

### ✅ Cloud Integration
- **Database**: Supabase PostgreSQL for persistent global data.
- **Hosting**: Vercel for 24/7 uptime.
- **Bridge**: Ngrok TCP tunnel handles the connection to the local router.

---

**Everything is locked in and ready for production! 🚀**
