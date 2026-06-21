'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wifi,
  Users,
  TrendingUp,
  Activity,
  Router,
  LogOut,
  Settings,
  Database,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Download,
  Shield,
  Zap
} from 'lucide-react';

interface Payment {
  id: string;
  transactionRef: string | null;
  amount: number;
  phoneNumber: string | null;
  voucherCode: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface ActiveTicket {
  id: string;
  voucherCode: string;
  macAddress: string;
  ipAddress: string;
  expiresAt: string;
  createdAt: string;
}

interface VoucherOffer {
  id: string;
  name: string;
  duration: string;
  price: number;
  max_devices: number;
  download_limit: string;
  upload_limit: string;
  expiry_mode: string;
  isSystem: boolean;
  createdAt: string;
}

interface RevenueAnalytics {
  totalRevenue: number;
  transactionCount: number;
  dailyStats: Record<string, number>;
  packageBreakdown: any[];
  recentTransactions: any[];
}

interface RouterSystem {
  cpu: number;
  memory: string;
  uptime: string;
  isOnline: boolean;
}

interface NetworkHealth {
  wanStats: {
    name: string;
    rxRate: string;
    txRate: string;
  } | null;
  peripherals: Array<{
    name: string;
    ip: string;
    alive: boolean;
    avgRtt?: string;
  }>;
}

interface PaymentLog {
  id: string;
  phoneNumber: string | null;
  amount: number | null;
  status: string;
  resultDesc: string | null;
  createdAt: string;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({ totalRevenue: 0, activeTickets: [], recentPayments: [] });
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [offers, setOffers] = useState<VoucherOffer[]>([]);
  const [bulkVouchers, setBulkVouchers] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);
  const [routerInfo, setRouterInfo] = useState<RouterSystem>({ cpu: 0, memory: '0', uptime: '0s', isOnline: false });
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('default-site');
  const [systemSettings, setSystemSettings] = useState({ bannerText: '', bannerType: 'info' });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => { routerRef.current = router; }, [router]);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    duration: '',
    durationMin: '60',
    price: '',
    download_limit: '5M',
    upload_limit: '5M',
    data_limit_mb: '',
    max_devices: '1',
    expiry_mode: 'CONTINUOUS',
  });

  const [bulkGen, setBulkGen] = useState({ offerId: '', batchSize: 20 });
  const [generatedBatch, setGeneratedBatch] = useState<any[]>([]);
  const [showBulkScreen, setShowBulkScreen] = useState(false);

  // Prevents overlapping fetch cycles
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async (isInitial = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      if (isInitial) setLoading(true);

      const headers = {
        'ngrok-skip-browser-warning': 'true',
        'Bypass-Tunnel-Reminder': 'true'
      };

      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          if (res.status === 401) {
            routerRef.current.push('/admin/login');
            return null;
          }
          if (!res.ok) return null;
          const text = await res.text();
          if (text.includes('<!DOCTYPE') || text.includes('<html')) return null;
          return JSON.parse(text);
        } catch (e) {
          return null;
        }
      };

      const [
        metrData, offersData, bulkData, sessData, anaData,
        sysData, settingsData, ledgerData, netData,
        sitesData, backupData, alertData
      ] = await Promise.all([
        safeFetch(`/api/admin/metrics?siteId=${selectedSite}`),
        safeFetch(`/api/admin/offers?siteId=${selectedSite}`),
        safeFetch(`/api/admin/vouchers/list?siteId=${selectedSite}`),
        safeFetch(`/api/admin/router/active-users?siteId=${selectedSite}`),
        safeFetch(`/api/admin/analytics/revenue?siteId=${selectedSite}`),
        safeFetch(`/api/admin/router/system-info?siteId=${selectedSite}`),
        safeFetch('/api/admin/settings'),
        safeFetch(`/api/admin/ledger?siteId=${selectedSite}`),
        safeFetch(`/api/admin/network/health?siteId=${selectedSite}`),
        safeFetch('/api/admin/sites'),
        safeFetch(`/api/admin/backup?siteId=${selectedSite}`),
        safeFetch(`/api/admin/alerts?siteId=${selectedSite}`)
      ]);

      if (metrData) setMetrics(metrData);
      if (offersData) setOffers(Array.isArray(offersData) ? offersData : []);
      if (bulkData) setBulkVouchers(Array.isArray(bulkData) ? bulkData : []);
      if (sessData) setActiveSessions(Array.isArray(sessData) ? sessData : []);
      if (anaData) setAnalytics(anaData);
      if (settingsData) setSystemSettings(settingsData);
      if (ledgerData) setLedger(Array.isArray(ledgerData) ? ledgerData : []);
      if (netData) setNetworkHealth(netData);
      if (sitesData) setSites(Array.isArray(sitesData) ? sitesData : []);
      if (backupData) setBackups(Array.isArray(backupData) ? backupData : []);
      if (alertData) setSecurityAlerts(Array.isArray(alertData) ? alertData : []);

      if (sysData) {
          setRouterInfo({
              cpu: parseInt(sysData['cpu-load']) || 0,
              memory: `${(parseInt(sysData['free-memory']) / (1024 * 1024)).toFixed(1)} MB`,
              uptime: sysData.uptime,
              isOnline: true
          });
      }
    } catch (err) {
      console.error("Dashboard refresh error:", err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [selectedSite]);

  // Handle site changes immediately
  useEffect(() => {
    fetchData(true);
  }, [selectedSite, fetchData]);

  // Stabilized background polling
  const fetchRef = useRef(fetchData);
  useEffect(() => { fetchRef.current = fetchData; }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchRef.current(false);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/offers', {
      method: formData.id ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'Bypass-Tunnel-Reminder': 'true'
      },
      body: JSON.stringify({ ...formData, siteId: selectedSite })
    });
    if (res.ok) {
      setFormData({id:'', name:'', duration:'', durationMin:'60', price:'', download_limit:'5M', upload_limit:'5M', data_limit_mb: '', max_devices:'1', expiry_mode:'CONTINUOUS'});
      fetchData(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemSettings)
    });
    alert("System settings updated!");
  };

  const handleKickUser = async (username: string) => {
    if(!confirm(`Kick user: ${username}?`)) return;
    const res = await fetch('/api/admin/router/kick', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'Bypass-Tunnel-Reminder': 'true'
      },
      body: JSON.stringify({ username, siteId: selectedSite })
    });
    if (res.ok) fetchData(false);
  };

  const handleDeadswitch = async (voucherCode: string, macAddress: string) => {
    if(!confirm(`🔥 NUCLEAR OPTION: Kick and PERMANENTLY BAN device ${macAddress}?`)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/router/ban', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ macAddress, voucherCode, siteId: selectedSite })
      });

      if (res.ok) {
        alert("Target neutralized and blacklisted.");
        fetchData(false);
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error}`);
      }
    } catch (e) {
      alert("Deadswitch failed to trigger.");
    } finally {
      setLoading(false);
    }
  };

  const handleNuclearReset = async () => {
    const secret = prompt("ENTER ADMIN SECRET TO WIPE ALL REVENUE AND DATA:");
    if (!secret) return;

    if(!confirm("ARE YOU ABSOLUTELY SURE? This will delete all payments, vouchers, and sessions. This cannot be undone.")) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/system/reset-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret })
      });

      if (res.ok) {
        alert("Revenue system has been factory reset.");
        window.location.reload();
      } else {
        const err = await res.json();
        alert(`Reset failed: ${err.error}`);
      }
    } catch (e) {
      alert("Critical error during reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleExtendTime = async (voucherCode: string) => {
    const mins = prompt("Enter minutes to add (e.g. 30):", "30");
    if (!mins) return;
    const res = await fetch('/api/admin/router/extend-time', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ voucherCode, minutes: parseInt(mins), siteId: selectedSite })
    });
    if (res.ok) {
      alert("Time extended successfully!");
      fetchData(false);
    } else alert("Failed to extend time.");
  };

  const handleReconcile = async () => {
    const ref = prompt("Enter Safaricom/Paystack Transaction Reference:");
    if (!ref) return;
    setLoading(true);
    const res = await fetch('/api/admin/reconcile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ reference: ref, siteId: selectedSite })
    });
    setLoading(false);
    if (res.ok) {
        const data = await res.json();
        alert(`Success! Voucher ${data.voucherCode} activated.`);
        fetchData(false);
    } else {
        const err = await res.json();
        alert(`Error: ${err.error}`);
    }
  };

  const handleGenerateBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/vouchers/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'Bypass-Tunnel-Reminder': 'true'
      },
      body: JSON.stringify({
        package_id: bulkGen.offerId,
        batch_size: bulkGen.batchSize,
        siteId: selectedSite
      })
    });
    const data = await res.json();
    setGeneratedBatch(data.vouchers);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleResendVoucher = async (paymentId: string, phoneNumber: string | null) => {
    const phone = phoneNumber || prompt("Enter Phone Number (254...):");
    if (!phone) return;
    const res = await fetch('/api/admin/vouchers/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, phoneNumber: phone })
    });
    if (res.ok) alert("Voucher resent!");
    else alert("Failed to resend.");
  };

  const handleResendVoucherByRef = async (ref: string, phoneNumber: string | null) => {
    // Find payment by ref first
    const phone = phoneNumber || prompt("Enter Phone Number (254...):");
    if (!phone) return;
    const res = await fetch('/api/admin/vouchers/resend-by-ref', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, phoneNumber: phone })
    });
    if (res.ok) alert("Voucher resent!");
    else alert("Failed to resend.");
  };

  const handleBroadcast = async () => {
      const msg = prompt("Enter Broadcast Message (Sent to users from last 7 days):", "Dear Customer, our Starlink Net lines will undergo maintenance at 2:00 AM.");
      if (!msg) return;
      if (!confirm("Are you sure you want to send this broadcast?")) return;

      const res = await fetch('/api/admin/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, siteId: selectedSite })
      });
      if (res.ok) alert("Broadcast queued!");
      else alert("Failed to send broadcast.");
  };

  const handlePowerCycle = async (deviceName: string) => {
      if(!confirm(`Send Hard Reboot command to ${deviceName}?`)) return;
      alert(`Hard Reboot command sent to Smart PDU for ${deviceName}. This usually takes 60s.`);
  };

  const handleCreateBackup = async () => {
      setLoading(true);
      const res = await fetch('/api/admin/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: selectedSite })
      });
      setLoading(false);
      if (res.ok) {
          alert("Cloud Backup generated successfully!");
          fetchData(false);
      } else alert("Backup failed. Check router connectivity.");
  };

  const handleScanSecurity = async () => {
      setLoading(true);
      await fetch(`/api/admin/network/scan-rogue?siteId=${selectedSite}`);
      setLoading(false);
      alert("Wireless scan completed. Check Security Alerts for findings.");
      fetchData(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
      <Zap className="w-12 h-12 text-indigo-500 animate-pulse" />
      <div className="text-white text-xl animate-pulse font-black uppercase">LOADING FULIFI OPERATOR...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-sans">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">FULIFI <span className="text-indigo-500">OPERATOR</span></h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-3 h-3 text-emerald-500" /> SYSTEM WIDE CONTROL
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <select
            value={selectedSite}
            onChange={(e) => setSelectedSite(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-indigo-400 outline-none focus:border-indigo-500"
          >
            <option value="default-site">Main Site</option>
            {sites.map(site => (
                <option key={site.id} value={site.id}>{site.name}</option>
            ))}
          </select>
          <button onClick={handleNuclearReset} className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border border-red-500/30 transition-all flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Wipe Revenue
          </button>
          <button onClick={handleBroadcast} className="bg-amber-600/20 hover:bg-amber-600 text-amber-500 hover:text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border border-amber-500/30 transition-all flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Bulk Broadcast
          </button>
          <button onClick={() => setShowBulkScreen(!showBulkScreen)} className="bg-gray-800 hover:bg-gray-700 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase border border-gray-700 transition-all flex items-center gap-2">
            {showBulkScreen ? <Smartphone className="w-4 h-4" /> : <Database className="w-4 h-4" />}
            {showBulkScreen ? "Return Dashboard" : "Bulk Batch Printer"}
          </button>
          <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-all"><LogOut /></button>
        </div>
      </header>

      {!showBulkScreen ? (
        <div className="space-y-8 animate-in fade-in duration-500">

          {/* ROUTER HEALTH & SYSTEM ALERTS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center gap-4">
                <div className={`p-2 rounded-lg ${routerInfo.isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    <Router className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-[10px] text-gray-500 uppercase font-black">Router Health</p>
                    <p className={`text-xs font-bold ${routerInfo.isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                        {routerInfo.isOnline ? 'EXCELLENT' : 'UNREACHABLE'}
                    </p>
                </div>
             </div>
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">CPU Load</p>
                <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all" style={{ width: `${routerInfo.cpu}%` }} />
                </div>
                <p className="text-[10px] text-right mt-1 font-bold text-indigo-400">{routerInfo.cpu}%</p>
             </div>
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <p className="text-[10px] text-gray-500 uppercase font-black">Free Memory</p>
                <p className="text-sm font-bold text-white">{routerInfo.memory}</p>
             </div>
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                <p className="text-[10px] text-gray-500 uppercase font-black">Router Uptime</p>
                <p className="text-sm font-bold text-white">{routerInfo.uptime}</p>
             </div>
          </div>

          {/* NETWORK PERIPHERALS & WAN PERFORMANCE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Security Alerts */}
             <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-500" /> Security & Threat Intel
                    </h3>
                    <button onClick={handleScanSecurity} className="text-[10px] font-black uppercase text-indigo-400 hover:text-white transition-colors">Run Scan</button>
                </div>
                <div className="space-y-3">
                    {securityAlerts.map(alert => (
                        <div key={alert.id} className={`p-3 rounded-xl border ${alert.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                            <p className="text-[10px] font-black uppercase mb-1">{alert.type}</p>
                            <p className="text-xs">{alert.message}</p>
                        </div>
                    ))}
                    {securityAlerts.length === 0 && (
                        <div className="p-8 text-center text-gray-600 italic text-xs">No active threats detected in airspace.</div>
                    )}
                </div>
             </div>

             {/* Cloud Backups */}
             <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                        <Database className="w-4 h-4 text-indigo-500" /> Router Cloud Backups
                    </h3>
                    <button onClick={handleCreateBackup} className="text-[10px] font-black uppercase text-indigo-400 hover:text-white transition-colors">Trigger Backup</button>
                </div>
                <div className="space-y-2">
                    {backups.map(b => (
                        <div key={b.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-900/50 border border-gray-700">
                            <div>
                                <p className="text-xs font-bold text-gray-300">{b.filename}</p>
                                <p className="text-[9px] text-gray-500 uppercase">{new Date(b.createdAt).toLocaleString()}</p>
                            </div>
                            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(b.content)}`} download={b.filename} className="p-2 hover:bg-gray-800 rounded-lg text-indigo-400">
                                <Download className="w-4 h-4" />
                            </a>
                        </div>
                    ))}
                    {backups.length === 0 && <p className="text-center text-gray-600 py-8 text-xs italic">No cloud backups available.</p>}
                </div>
             </div>

             <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" /> Peripheral Hardware Status
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {networkHealth?.peripherals.map((p, i) => (
                        <div key={i} className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-[10px] font-black uppercase text-gray-400">{p.name}</p>
                                <div className={`w-2 h-2 rounded-full ${p.alive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-red-500 animate-pulse'}`} />
                            </div>
                            <p className="text-[9px] font-mono text-gray-500">{p.ip}</p>
                            {p.alive && p.avgRtt && (
                                <p className="text-[9px] font-bold text-indigo-400 mt-1">{p.avgRtt}</p>
                            )}
                            {!p.alive && (
                                <div className="mt-1 flex justify-between items-center">
                                    <p className="text-[9px] font-bold text-red-400 uppercase">Offline</p>
                                    <button
                                        onClick={() => handlePowerCycle(p.name)}
                                        className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-2 py-0.5 rounded text-[8px] font-black uppercase transition-all"
                                    >Reboot</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
             </div>

             <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" /> Live WAN Interface
                </h3>
                {networkHealth?.wanStats ? (
                    <div className="flex items-center justify-between gap-8">
                        <div className="flex-1">
                            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Download (RX)</p>
                            <p className="text-2xl font-black text-white">{(parseInt(networkHealth.wanStats.rxRate) / 1000000).toFixed(1)} <span className="text-xs text-gray-500 uppercase">Mbps</span></p>
                        </div>
                        <div className="h-12 w-[1px] bg-gray-700" />
                        <div className="flex-1 text-right">
                            <p className="text-[10px] text-gray-500 uppercase font-black mb-1 text-right">Upload (TX)</p>
                            <p className="text-2xl font-black text-white">{(parseInt(networkHealth.wanStats.txRate) / 1000000).toFixed(1)} <span className="text-xs text-gray-500 uppercase">Mbps</span></p>
                        </div>
                    </div>
                ) : (
                    <div className="h-16 flex items-center justify-center text-gray-600 italic text-xs">
                        WAN interface statistics unavailable
                    </div>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-2xl shadow-indigo-500/10 border border-white/5 relative overflow-hidden group">
              <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Net Revenue</p>
              <h3 className="text-4xl font-black mt-2">KSh {analytics?.totalRevenue || 0}</h3>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 relative overflow-hidden group">
              <Users className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Active Leases</p>
              <h3 className="text-4xl font-black mt-2 text-white">{activeSessions.length}</h3>
            </div>
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Router Status</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                <span className="text-xl font-black text-emerald-400 uppercase tracking-tighter">CONNECTED</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-black/40 p-5 rounded-xl border border-gray-800 shadow-inner">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Activity className="w-3 h-3 text-indigo-500" /> Live System Activity
                    </h3>
                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-hide">
                        {analytics?.recentTransactions?.map((log: any) => (
                            <div key={log.id} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 flex justify-between items-center text-[10px] hover:bg-gray-800 transition-colors">
                                <div>
                                    <p className="font-bold text-gray-200">{log.phoneNumber || 'Internal'}</p>
                                    <p className="text-gray-500 truncate w-32">{log.resultDesc}</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <p className="text-emerald-400 font-bold">KSh {log.amount}</p>
                                    <div className="flex gap-2 items-center">
                                        {log.status === 'SUCCESS' && (
                                            <button
                                                onClick={() => handleResendVoucherByRef(log.externalReference, log.phoneNumber)}
                                                className="text-[8px] bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white px-2 py-0.5 rounded transition-colors uppercase font-bold"
                                            >Resend WA</button>
                                        )}
                                        <span className={`text-[8px] font-black uppercase ${log.status === 'SUCCESS' ? 'text-green-500' : 'text-red-500'}`}>{log.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleCreateOffer} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-gray-700 pb-2">Package Config</h3>
                    <div className="space-y-3">
                        <input type="text" placeholder="Display Name (e.g., 1GB SuperFast)" className="w-full bg-gray-900 border border-gray-700 p-2.5 rounded-lg text-xs text-white outline-none focus:border-indigo-500" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required />

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9px] text-gray-500 uppercase font-black block mb-1">Display Duration</label>
                                <input type="text" placeholder="e.g., 24 hours" className="w-full bg-gray-900 border border-gray-700 p-2.5 rounded-lg text-xs text-white outline-none focus:border-indigo-500" value={formData.duration} onChange={e=>setFormData({...formData, duration:e.target.value})} required />
                            </div>
                            <div>
                                <label className="text-[9px] text-gray-500 uppercase font-black block mb-1">Minutes</label>
                                <input type="number" placeholder="60" className="w-full bg-gray-900 border border-gray-700 p-2.5 rounded-lg text-xs text-white outline-none focus:border-indigo-500" value={formData.durationMin} onChange={e=>setFormData({...formData, durationMin:e.target.value})} required />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] text-gray-500 uppercase font-black block mb-1">Price (KSh)</label>
                            <input type="number" placeholder="50" className="w-full bg-gray-900 border border-gray-700 p-2.5 rounded-lg text-xs text-white outline-none focus:border-indigo-500" value={formData.price} onChange={e=>setFormData({...formData, price:e.target.value})} required />
                        </div>

                        <div className="bg-black/20 p-4 rounded-xl border border-gray-700/50 space-y-4">
                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Speed & Data Limits</p>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] text-gray-500 uppercase font-black block mb-1">Download (Mbps)</label>
                                    <input type="text" placeholder="5M" className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg text-[10px] text-white outline-none" value={formData.download_limit} onChange={e=>setFormData({...formData, download_limit:e.target.value})} />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-500 uppercase font-black block mb-1">Upload (Mbps)</label>
                                    <input type="text" placeholder="5M" className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg text-[10px] text-white outline-none" value={formData.upload_limit} onChange={e=>setFormData({...formData, upload_limit:e.target.value})} />
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] text-teal-400 uppercase font-black block mb-1">Data Cap (Optional)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Volume"
                                        className="flex-1 bg-gray-900 border border-teal-900/30 p-2 rounded-lg text-[10px] text-white outline-none focus:border-teal-500"
                                        value={formData.data_limit_mb}
                                        onChange={e=>setFormData({...formData, data_limit_mb:e.target.value})}
                                    />
                                    <select
                                        className="bg-gray-900 border border-gray-700 p-2 rounded-lg text-[9px] text-gray-400"
                                        onChange={(e) => {
                                            const val = parseInt(formData.data_limit_mb);
                                            if (!isNaN(val)) {
                                                if (e.target.value === 'GB') setFormData({...formData, data_limit_mb: String(val * 1024)});
                                                // If switching back to MB, we assume the current number IS in MB.
                                                // This is a simple helper.
                                            }
                                        }}
                                    >
                                        <option value="MB">MB</option>
                                        <option value="GB">GB</option>
                                    </select>
                                </div>
                                <p className="text-[8px] text-gray-500 mt-1 uppercase italic">Set volume to 0 or leave blank for unlimited speed-capped data.</p>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 p-3 rounded-lg font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-900/20 transition-all">Write Profile</button>
                    </div>
                </form>

                {/* BANNER MANAGER */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-gray-700 pb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> Portal Announcement
                    </h3>
                    <textarea
                        className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-xs text-white outline-none focus:border-amber-500 min-h-[80px]"
                        placeholder="Type urgent maintenance or promo message here..."
                        value={systemSettings.bannerText}
                        onChange={e => setSystemSettings({...systemSettings, bannerText: e.target.value})}
                    />
                    <div className="flex gap-2">
                        <select
                            className="bg-gray-900 border border-gray-700 p-2 rounded-lg text-xs text-white flex-1"
                            value={systemSettings.bannerType}
                            onChange={e => setSystemSettings({...systemSettings, bannerType: e.target.value})}
                        >
                            <option value="info">Info (Indigo)</option>
                            <option value="warning">Warning (Amber)</option>
                            <option value="maintenance">Danger (Red)</option>
                        </select>
                        <button
                            onClick={handleUpdateSettings}
                            className="bg-amber-600 hover:bg-amber-500 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest"
                        >Update Banner</button>
                    </div>
                </div>

                {/* MANUAL RECONCILIATION */}
                <div className="bg-indigo-900/10 p-5 rounded-xl border border-indigo-500/20 space-y-3">
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Manual Reconcile</p>
                    <p className="text-[9px] text-gray-500">If a user paid but wasn't activated, force provision their session here.</p>
                    <button
                        onClick={handleReconcile}
                        className="w-full bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/30 p-2.5 rounded-lg text-[10px] font-black uppercase transition-all"
                    >
                        Override & Activate
                    </button>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 min-h-[500px] shadow-2xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 uppercase tracking-tighter text-white">
                        <Router className="w-5 h-5 text-indigo-500" /> Real-Time Active Sessions
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-[10px] text-gray-500 uppercase font-black border-b border-gray-700">
                                <tr>
                                    <th className="p-4">User / MAC Identity</th>
                                    <th className="p-4">IP Address</th>
                                    <th className="p-4">Package Type</th>
                                    <th className="p-4">Uptime</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs text-gray-300 divide-y divide-gray-700/30">
                                {activeSessions.map(s => (
                                    <tr key={s.id} className="hover:bg-gray-700/20 transition-colors">
                                        <td className="p-4 font-mono font-bold">
                                            <p className="text-indigo-400">{s.voucherCode}</p>
                                            <p className="text-[9px] text-gray-500">{s.macAddress}</p>
                                        </td>
                                        <td className="p-4 text-gray-400 font-mono">{s.ipAddress}</td>
                                        <td className="p-4"><span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-md text-[9px] font-bold uppercase">{s.packageName}</span></td>
                                        <td className="p-4 text-emerald-400 font-bold tracking-widest">{s.uptime}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => handleExtendTime(s.voucherCode)}
                                                    className="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg border border-indigo-500/20 font-black uppercase text-[9px] transition-all flex items-center gap-1"
                                                    title="Add Time"
                                                >
                                                    <Clock className="w-3 h-3" /> +Time
                                                </button>
                                                <button
                                                    onClick={() => handleDeadswitch(s.voucherCode, s.macAddress)}
                                                    className="bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg border border-red-500/20 font-black uppercase text-[9px] transition-all flex items-center gap-1"
                                                    title="Deadswitch: Kick & Ban"
                                                >
                                                    <Zap className="w-3 h-3" /> Deadswitch
                                                </button>
                                                <button
                                                    onClick={() => handleKickUser(s.voucherCode)}
                                                    className="bg-amber-500/10 text-amber-500 hover:bg-amber-600 hover:text-white px-3 py-1.5 rounded-lg border border-amber-500/20 font-black uppercase text-[9px] transition-all flex items-center gap-1"
                                                    title="Force Disconnect Device"
                                                >
                                                    <LogOut className="w-3 h-3" /> Kick
                                                </button>
                                                <button
                                                    onClick={() => handleKickUser(s.voucherCode)}
                                                    className="bg-red-500/10 text-red-500 hover:bg-red-700 hover:text-white px-3 py-1.5 rounded-lg border border-red-500/20 font-black uppercase text-[9px] transition-all flex items-center gap-1"
                                                >
                                                    <XCircle className="w-3 h-3" /> Terminate
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {activeSessions.length === 0 && (
                                    <tr><td colSpan={5} className="p-20 text-center text-gray-600 italic">No active hardware leases detected.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* WEBHOOK AUDIT LEDGER */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mt-8">
                  <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2 uppercase tracking-tighter">
                    <Database className="w-5 h-5 text-indigo-500" /> Webhook Audit Ledger
                  </h3>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead>
                              <tr className="bg-gray-900/50 text-[9px] text-gray-500 uppercase font-black border-b border-gray-700">
                                  <th className="p-4">Reference</th>
                                  <th className="p-4">Phone</th>
                                  <th className="p-4">Amount</th>
                                  <th className="p-4">Status</th>
                                  <th className="p-4">Time</th>
                              </tr>
                          </thead>
                          <tbody className="text-xs text-gray-400 divide-y divide-gray-700/30">
                              {ledger.map(event => (
                                  <tr key={event.id} className="hover:bg-gray-700/10 transition-colors">
                                      <td className="p-4 font-mono text-[10px]">{event.externalReference}</td>
                                      <td className="p-4">{event.phoneNumber}</td>
                                      <td className="p-4 text-white">KSh {event.amount}</td>
                                      <td className="p-4">
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                                event.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' :
                                                event.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                                {event.status}
                                            </span>
                                            {event.status === 'SUCCESS' && (
                                                <button
                                                    onClick={() => handleResendVoucherByRef(event.externalReference, event.phoneNumber)}
                                                    className="p-1 hover:bg-gray-700 rounded text-indigo-400"
                                                    title="Resend via WhatsApp"
                                                >
                                                    <Smartphone className="w-3 h-3" />
                                                </button>
                                            )}
                                          </div>
                                      </td>
                                      <td className="p-4 text-[10px] opacity-50">{new Date(event.createdAt).toLocaleString()}</td>
                                  </tr>
                              ))}
                              {ledger.length === 0 && (
                                  <tr><td colSpan={5} className="p-10 text-center italic text-gray-600">No webhook events logged yet.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
                </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 p-10 rounded-2xl border border-gray-700 max-w-5xl mx-auto shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
            <h2 className="text-2xl font-black mb-2 text-white">Bulk Voucher Matrix Generator</h2>
            <p className="text-gray-400 text-xs mb-8 uppercase tracking-widest font-bold">Structural token generation for physical distribution</p>

            <form onSubmit={handleGenerateBulk} className="flex flex-wrap gap-6 items-end bg-gray-900/50 p-6 rounded-2xl mb-8 border border-gray-700">
                <div className="flex-1 min-w-[250px]">
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Target Offer Tier</label>
                    <select className="w-full bg-gray-900 border border-gray-700 p-3.5 rounded-xl text-xs text-white outline-none focus:border-indigo-500 shadow-inner" onChange={e => setBulkGen({...bulkGen, offerId: e.target.value})}>
                        <option value="">-- Choose Package --</option>
                        {offers.map(o => <option key={o.id} value={o.id}>{o.name} (KSh {o.price})</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] text-gray-500 font-black uppercase mb-2 block tracking-widest">Batch Size</label>
                    <input
                      type="number"
                      className="w-32 bg-gray-800 border border-gray-700 p-3.5 rounded-xl text-xs text-white shadow-inner"
                      value={isNaN(bulkGen.batchSize) ? '' : bulkGen.batchSize}
                      onChange={e => setBulkGen({...bulkGen, batchSize: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                    />
                </div>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-10 py-3.5 rounded-xl font-black uppercase text-xs shadow-lg shadow-indigo-900/30 transition-all">Generate Matrix</button>
            </form>

            {generatedBatch.length > 0 && (
                <div className="animate-in zoom-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">SUCCESSFULLY BUILT {generatedBatch.length} KEYS</span>
                        <button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-500 px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-900/20 transition-all">Print Voucher Sheets</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4 p-8 bg-white rounded-2xl voucher-grid">
                        {generatedBatch.map((v, i) => (
                            <div key={i} className="border-2 border-dashed border-gray-300 p-5 text-center rounded-2xl text-black hover:border-indigo-500 transition-colors voucher-card">
                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-1">STARLINKNET WIFI</p>
                                <p className="text-xl font-mono font-black border-y border-gray-100 py-2 tracking-tighter">{v.code}</p>
                                <p className="text-[9px] font-bold text-gray-500 uppercase mt-1">Connect & Browse</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; padding: 0 !important; }
          header, form, .grid, .max-w-5xl { border: none !important; box-shadow: none !important; }
          .voucher-grid { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 10px !important; padding: 0 !important; background: white !important; }
          .voucher-card { border: 1px solid #000 !important; padding: 10px !important; text-align: center !important; break-inside: avoid; background: white !important; }
        }
      `}</style>
    </div>
  );
}
