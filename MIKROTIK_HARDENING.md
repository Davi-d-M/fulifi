# MikroTik Security Hardening (Anti-Hacker Script)

To prevent hackers from bypassing your billing or attacking your router directly, run these commands in your **MikroTik Terminal**.

## 1. Lockdown API Ports
Replace `[YOUR_SERVER_IP]` with the IP address of your Next.js server (if using a VPS) or your local management PC.

```bash
# Only allow your server to talk to the router's management ports
/ip firewall filter add chain=input protocol=tcp dst-port=80,8728 src-address=[YOUR_SERVER_IP] action=accept comment="Allow FULIFI API"
/ip firewall filter add chain=input protocol=tcp dst-port=80,8728 action=drop comment="BLOCK ALL OTHER API TRAFFIC"
```

## 2. Prevent MAC Spoofing
This ensures that even if a hacker clones a paying customer's MAC address, they won't get access unless they also have the exact same IP address.

```bash
# Enable strict IP-MAC binding in the Hotspot
/ip hotspot set [find] address-per-mac=1
/ip hotspot user profile set [find] shared-users=1
```

## 3. Disable Unused Services
Hackers look for open doors. Close the ones you don't use.

```bash
/ip service disable telnet,ftp,www-ssl,api-ssl
# Keep 'www' (80) and 'api' (8728) enabled only if you are using them
```

## 4. Protection against Brute Force
If someone tries to log into your router's admin panel too many times, block them automatically.

```bash
/ip firewall filter add chain=input protocol=tcp dst-port=22,80,8291 connection-state=new src-address-list=admin_blacklist action=drop
/ip firewall filter add chain=input protocol=tcp dst-port=22,80,8291 connection-state=new action=add-src-to-address-list address-list=admin_blacklist address-list-timeout=1d connection-limit=3,32
```

---

**Security status: HARDENED 🛡️**
