# MikroTik Hardware Hardening & Optimization

To complete your "Bulletproof" setup, run these commands in your MikroTik terminal.

## 1. MAC Address Spoofing & Session Hijacking Defense
Prevent advanced users from cloning MAC addresses to steal premium access.

```bash
# 1. Force the router to bind the user's IP to their MAC address
# 2. Limit each MAC to exactly 1 simultaneous session
/ip hotspot profile set Starlink_Prof address-per-mac=1

# 3. Enable IP+MAC binding checks on the bridge
/interface bridge set [find name=bridge-hotspot] arp=reply-only
```

## 2. Router Storage Protection (Log Rotation)
Prevent the router from freezing due to flash storage filling up with logs.

```bash
# 1. Clear disk logs and move all logging to RAM (Memory)
/system logging action set memory memory-lines=1000
/system logging action set disk disk-lines-per-file=100

# 2. Configure Hotspot logs to stay in Memory
/system logging add action=memory topics=hotspot,info
/system logging add action=memory topics=hotspot,debug
/system logging add action=memory topics=hotspot,account
```

## 3. Hardware Auto-Reboot (Watchdog)
If the CPU hits 100% and the router freezes, the hardware will detect it and reboot automatically.

```bash
/system watchdog set watch-address=8.8.8.8 action=reboot
```

---

## 4. Advanced Security: Isolate Management
Ensure the public WiFi users cannot attempt to log into your router's admin panel.

```bash
# Drop all input traffic to the router from the Hotspot Bridge except DNS
/ip firewall filter add chain=input interface=bridge-hotspot protocol=udp dst-port=53 action=accept
/ip firewall filter add chain=input interface=bridge-hotspot protocol=tcp dst-port=53 action=accept
/ip firewall filter add chain=input interface=bridge-hotspot action=drop comment="BLOCK_HOTSPOT_TO_ROUTER_ADMIN"
```
