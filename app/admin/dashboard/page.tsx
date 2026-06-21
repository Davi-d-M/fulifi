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
  Zap,
  Lock
} from 'lucide-react';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>({ totalRevenue: 0, activeTickets: [], recentPayments: [] });
  const [offers, setOffers] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [routerInfo, setRouterInfo] = useState<any>({ cpu: 0, memory: '0', uptime: '0s', isOnline: false });
  const [networkHealth, setNetworkHealth] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('default-site');
  const [systemSettings, setSystemSettings] = useState({ bannerText: '', bannerType: 'info', blockTethering: false });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [formData, setFormData] = useState({
    id: '', name: '', duration: '', durationMin: '60', price: '',
    download_limit: '5M', upload_limit: '5M', data_limit_mb: '',
    max_devices: '1', expiry_mode: 'CONTINUOUS',
  });

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const headers = { 'ngrok-skip-browser-warning': 'true', 'Bypass-Tunnel-Reminder': 'true' };
      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          if (res.status === 401) { router.push('/admin/login'); return null; }
          const text = await res.text();
          return text.includes('<!DOCTYPE') ? null : JSON.parse(text);
        } catch (e) { return null; }
      };

      const [metr, offr, sess, ana, sys, sett, ledg, net, stes, back, alrt] = await Promise.all([
        safeFetch(`/api/admin/metrics?siteId=${selectedSite}`),
        safeFetch(`/api/admin/offers?siteId=${selectedSite}`),
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

      if (metr) setMetrics(metr);
      setOffers(Array.isArray(offr) ? offr : []);
      setActiveSessions(Array.isArray(sess) ? sess : []);
      if (ana) setAnalytics(ana);
      if (sett) setSystemSettings(sett);
      setLedger(Array.isArray(ledg) ? ledg : []);
      if (net) setNetworkHealth(net);
      setSites(Array.isArray(stes) ? stes : []);
      setBackups(Array.isArray(back) ? back : []);
      setSecurityAlerts(Array.isArray(alrt) ? alrt : []);

      if (sys) {
        setRouterInfo({
          cpu: parseInt(sys['cpu-load']) || 0,
          memory: `${(parseInt(sys['free-memory']) / (1024 * 1024)).toFixed(1)} MB`,
          uptime: sys.uptime,
          isOnline: true
        });
      }
    } catch (err) { console.error("Dashboard error:", err); } finally { setLoading(false); }
  }, [selectedSite, router]);

  useEffect(() => { fetchData(true); }, [fetchData]);
  useEffect(() => { const int = setInterval(() => fetchData(false), 20000); return () => clearInterval(int); }, [fetchData]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/offers', {
      method: formData.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, siteId: selectedSite })
    });
    if (res.ok) {
      setFormData({id:'', name:'', duration:'', durationMin:'60', price:'', download_limit:'5M', upload_limit:'5M', data_limit_mb: '', max_devices:'1', expiry_mode:'CONTINUOUS'});
      fetchData(false);
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(systemSettings) });

    // Also trigger the actual hardware rule
    await fetch('/api/admin/system/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockTethering: systemSettings.blockTethering })
    });

    alert("System settings updated!");
  };

  const handleReconcile = async () => {
    const ref = prompt("Enter Paystack Transaction Reference:");
    if (!ref) return;
    setLoading(true);
    const res = await fetch('/api/admin/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, siteId: selectedSite })
    });
    setLoading(false);
    if (res.ok) { fetchData(false); alert("Success!"); }
    else alert("Failed to reconcile.");
  };

  const handleCreateBackup = async () => {
      setLoading(true);
      await fetch('/api/admin/backup', { method: 'POST', body: JSON.stringify({ siteId: selectedSite }) });
      setLoading(false);
      fetchData(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
      <Zap className="w-12 h-12 text-indigo-500 animate-pulse" />
      <div className="text-white text-xl animate-pulse font-black uppercase">SYNCING FULIFI CLOUD...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6 font-sans">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20"><Zap className="w-8 h-8 text-white fill-white" /></div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">FULIFI <span className="text-indigo-500">OPERATOR</span></h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2"><Activity className="w-3 h-3 text-emerald-500" /> CLOUD LINK ACTIVE</p>
          </div>
        </div>
        <div className="flex gap-4">
          <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-indigo-400">
            <option value="default-site">Main Site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={() => fetchData(true)} className="text-gray-500 hover:text-white"><Activity /></button>
          <button onClick={() => router.push('/admin/login')} className="text-gray-500 hover:text-white"><LogOut /></button>
        </div>
      </header>

      <div className="space-y-8">
        {/* STATS STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center gap-4">
            <div className={`p-2 rounded-lg ${routerInfo.isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}><Router className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-black">Router Status</p>
              <p className={`text-xs font-bold ${routerInfo.isOnline ? 'text-emerald-400' : 'text-red-400'}`}>{routerInfo.isOnline ? 'CONNECTED' : 'OFFLINE'}</p>
            </div>
          </div>
          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">CPU Load</p>
            <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-indigo-500 h-full transition-all" style={{ width: `${routerInfo.cpu}%` }} /></div>
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

        {/* NETWORK & SECURITY ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Alerts */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-red-500" /> Security & Threat Intel</h3>
            <div className="space-y-3">
              {(securityAlerts || []).map((alert: any) => (
                <div key={alert.id} className={`p-3 rounded-xl border ${alert.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                  <p className="text-[10px] font-black uppercase mb-1">{alert.type}</p>
                  <p className="text-xs">{alert.message}</p>
                </div>
              ))}
              {(securityAlerts || []).length === 0 && <div className="p-8 text-center text-gray-600 italic text-xs">No active threats detected.</div>}
            </div>
          </div>

          {/* Cloud Backups */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2"><Database className="w-4 h-4 text-indigo-500" /> Router Backups</h3>
              <button onClick={handleCreateBackup} className="text-[10px] font-black uppercase text-indigo-400 hover:text-white">Trigger Backup</button>
            </div>
            <div className="space-y-2">
              {(backups || []).map((b: any) => (
                <div key={b.id} className="flex justify-between items-center p-2 rounded-lg bg-gray-900/50 border border-gray-700">
                  <div>
                    <p className="text-xs font-bold text-gray-300">{b.filename}</p>
                    <p className="text-[9px] text-gray-500 uppercase">{new Date(b.createdAt).toLocaleString()}</p>
                  </div>
                  <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(b.content)}`} download={b.filename} className="p-2 hover:bg-gray-800 rounded-lg text-indigo-400"><Download className="w-4 h-4" /></a>
                </div>
              ))}
              {(backups || []).length === 0 && <p className="text-center text-gray-600 py-8 text-xs italic">No cloud backups available.</p>}
            </div>
          </div>
        </div>

        {/* PERIPHERALS & WAN ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-500" /> Peripheral Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(networkHealth?.peripherals || []).map((p: any, i: number) => (
                <div key={i} className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-[10px] font-black uppercase text-gray-400">{p.name}</p>
                    <div className={`w-2 h-2 rounded-full ${p.alive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </div>
                  <p className="text-[9px] font-mono text-gray-500">{p.ip}</p>
                  <p className={`text-[9px] font-bold mt-1 ${p.alive ? 'text-indigo-400' : 'text-red-400'}`}>{p.alive ? (p.avgRtt || 'Active') : 'OFFLINE'}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> WAN Performance</h3>
            <div className="flex items-center justify-between gap-8">
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Download</p>
                <p className="text-2xl font-black text-white">{(parseInt(networkHealth?.wanStats?.rxRate || 0) / 1000000).toFixed(1)} <span className="text-xs text-gray-500">Mbps</span></p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Upload</p>
                <p className="text-2xl font-black text-white">{(parseInt(networkHealth?.wanStats?.txRate || 0) / 1000000).toFixed(1)} <span className="text-xs text-gray-500">Mbps</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* REVENUE & USERS STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
            <TrendingUp className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Revenue</p>
            <h3 className="text-4xl font-black mt-2">KSh {analytics?.totalRevenue || metrics?.totalRevenue || 0}</h3>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 relative overflow-hidden group">
            <Users className="absolute -right-4 -bottom-4 w-32 h-32 opacity-5" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Active Leases</p>
            <h3 className="text-4xl font-black mt-2 text-white">{(activeSessions || []).length}</h3>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">System Link</p>
            <div className="mt-3 flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${routerInfo.isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'} shadow-[0_0_10px_rgba(16,185,129,0.5)]`}></span>
              <span className={`text-xl font-black ${routerInfo.isOnline ? 'text-emerald-400' : 'text-red-400'} uppercase`}>{routerInfo.isOnline ? 'SYNCED' : 'DISCONNECTED'}</span>
            </div>
          </div>
        </div>

        {/* MAIN CONTROLS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                {/* SYSTEM SETTINGS & TETHERING BLOCK */}
                <form onSubmit={handleUpdateSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-gray-700 pb-2 flex items-center gap-2"><Settings className="w-4 h-4 text-indigo-400" /> Control Center</h3>

                    <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-gray-700">
                        <div>
                            <p className="text-[10px] font-black uppercase text-white flex items-center gap-2"><Lock className="w-3 h-3 text-red-400" /> Prevent Sharing</p>
                            <p className="text-[8px] text-gray-500">Block users from sharing hotspot (TTL Block)</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSystemSettings({...systemSettings, blockTethering: !systemSettings.blockTethering})}
                            className={`w-12 h-6 rounded-full transition-colors relative ${systemSettings.blockTethering ? 'bg-red-600' : 'bg-gray-600'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${systemSettings.blockTethering ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500">Portal Banner</label>
                        <textarea
                            className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-xs text-white outline-none focus:border-amber-500 min-h-[60px]"
                            placeholder="Promo or maintenance text..."
                            value={systemSettings.bannerText}
                            onChange={e => setSystemSettings({...systemSettings, bannerText: e.target.value})}
                        />
                        <div className="flex gap-2">
                            <select className="bg-gray-900 border border-gray-700 p-2 rounded-lg text-xs text-white flex-1" value={systemSettings.bannerType} onChange={e => setSystemSettings({...systemSettings, bannerType: e.target.value})}>
                                <option value="info">Info</option>
                                <option value="warning">Warning</option>
                                <option value="maintenance">Danger</option>
                            </select>
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-4 rounded-lg font-black text-[10px] uppercase">Save</button>
                        </div>
                    </div>
                </form>

                {/* PACKAGE CONFIG */}
                <form onSubmit={handleCreateOffer} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-gray-700 pb-2">Voucher Config</h3>
                    <div className="space-y-3">
                        <input type="text" placeholder="Name (e.g. 1GB Fast)" className="w-full bg-gray-900 border border-gray-700 p-2.5 rounded-lg text-xs text-white" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required />
                        <div className="grid grid-cols-2 gap-3">
                            <input type="number" placeholder="Price (KES)" className="w-full bg-gray-900 border border-gray-700 p-2.5 rounded-lg text-xs text-white" value={formData.price} onChange={e=>setFormData({...formData, price:e.target.value})} required />
                            <input type="number" placeholder="Minutes" className="w-full bg-gray-900 border border-gray-700 p-2.5 rounded-lg text-xs text-white" value={formData.durationMin} onChange={e=>setFormData({...formData, durationMin:e.target.value})} required />
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 p-3 rounded-lg font-black text-xs uppercase shadow-lg transition-all">Create Profile</button>
                    </div>
                </form>

                {/* MANUAL RECONCILE */}
                <div className="bg-indigo-900/10 p-5 rounded-xl border border-indigo-500/20 space-y-3">
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Manual Activation</p>
                    <button onClick={handleReconcile} className="w-full bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/30 p-2.5 rounded-lg text-[10px] font-black uppercase transition-all">Override & Activate</button>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
                {/* ACTIVE SESSIONS TABLE */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 min-h-[400px] shadow-2xl">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 uppercase tracking-tighter text-white"><Router className="w-5 h-5 text-indigo-500" /> Live Hardware Leases</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900/50 text-[10px] text-gray-500 uppercase font-black border-b border-gray-700">
                                <tr>
                                    <th className="p-4">User / MAC</th>
                                    <th className="p-4">IP Address</th>
                                    <th className="p-4">Uptime</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs text-gray-300 divide-y divide-gray-700/30">
                                {(activeSessions || []).map((s: any) => (
                                    <tr key={s.id} className="hover:bg-gray-700/20 transition-colors">
                                        <td className="p-4 font-mono font-bold">
                                            <p className="text-indigo-400">{s.voucherCode}</p>
                                            <p className="text-[9px] text-gray-500">{s.macAddress}</p>
                                        </td>
                                        <td className="p-4 text-gray-400 font-mono">{s.ipAddress}</td>
                                        <td className="p-4 text-emerald-400 font-bold tracking-widest">{s.uptime}</td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                <button className="bg-amber-500/10 text-amber-500 hover:bg-amber-600 hover:text-white px-3 py-1.5 rounded-lg border border-amber-500/20 font-black uppercase text-[9px] transition-all">Kick</button>
                                                <button className="bg-red-500/10 text-red-500 hover:bg-red-700 hover:text-white px-3 py-1.5 rounded-lg border border-red-500/20 font-black uppercase text-[9px] transition-all">Terminate</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {(activeSessions || []).length === 0 && <tr><td colSpan={4} className="p-20 text-center text-gray-600 italic">No active hardware leases detected.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* WEBHOOK AUDIT LEDGER */}
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mt-8">
                  <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2 uppercase tracking-tighter"><Database className="w-5 h-5 text-indigo-500" /> Webhook Audit Ledger</h3>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                          <thead>
                              <tr className="bg-gray-900/50 text-[9px] text-gray-500 uppercase font-black border-b border-gray-700">
                                  <th className="p-4">Reference</th>
                                  <th className="p-4">Amount</th>
                                  <th className="p-4">Status</th>
                                  <th className="p-4">Time</th>
                              </tr>
                          </thead>
                          <tbody className="text-xs text-gray-400 divide-y divide-gray-700/30">
                              {(ledger || []).map((event: any) => (
                                  <tr key={event.id} className="hover:bg-gray-700/10 transition-colors">
                                      <td className="p-4 font-mono text-[10px]">{event.externalReference}</td>
                                      <td className="p-4 text-white">KSh {event.amount}</td>
                                      <td className="p-4">
                                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${event.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{event.status}</span>
                                      </td>
                                      <td className="p-4 text-[10px] opacity-50">{new Date(event.createdAt).toLocaleString()}</td>
                                  </tr>
                              ))}
                              {(ledger || []).length === 0 && <tr><td colSpan={4} className="p-10 text-center italic text-gray-600">No events logged yet.</td></tr>}
                          </tbody>
                      </table>
                  </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}