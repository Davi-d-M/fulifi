'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, TrendingUp, Activity, Router, LogOut, Settings,
  XCircle, Zap, Wifi, Clock, Database, Smartphone,
  CheckCircle2, ShieldAlert, Cpu, HardDrive, LayoutDashboard,
  Download, List, Printer, Plus, AlertTriangle, ArrowUpRight,
  Search, MessageSquare, Globe, Monitor, Eye
} from 'lucide-react';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<any>({ totalRevenue: 0, totalRegisteredDevices: 0 });
  const [offers, setOffers] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [deviceConnections, setDeviceConnections] = useState<any[]>([]);
  const [connectionHistory, setConnectionHistory] = useState<any[]>([]);
  const [connectionStats, setConnectionStats] = useState<any>(null);
  const [routerInfo, setRouterInfo] = useState<any>({ cpu: 0, memory: '0', uptime: '0s', isOnline: false });
  const [ledger, setLedger] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState('default-site');
  const [securityAlerts, setSecurityAlerts] = useState<any[]>([]);
  const [backups, setBackups] = useState<any[]>([]);
  const [speedLogs, setSpeedLogs] = useState<any[]>([]);
  const [latencyLogs, setLatencyLogs] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [showGlobal, setShowGlobal] = useState(false);
  const [systemSettings, setSystemSettings] = useState({ bannerText: '', bannerType: 'info', blockTethering: false });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBulkScreen, setShowBulkScreen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [liveTraffic, setLiveTraffic] = useState({ rx: 0, tx: 0 });
  const router = useRouter();

  // Form states
  const [formData, setFormData] = useState({
    id: '', name: '', durationMin: '60', price: '', download_limit: '5M', upload_limit: '5M', data_limit_mb: '', max_devices: '1', expiry_mode: 'CONTINUOUS'
  });
  const [bulkGen, setBulkGen] = useState({ package_id: '', batch_size: '20' });
  const [generatedBatch, setGeneratedBatch] = useState<any[]>([]);
  const [newSite, setNewSite] = useState({ name: '', location: '', routerHost: '', routerUser: '', routerPass: '' });
  const [showSiteForm, setShowSiteForm] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (msg: string) => setDebugLog(prev => [msg, ...prev].slice(0, 10));

  const fetchData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const headers = { 'ngrok-skip-browser-warning': 'true', 'Bypass-Tunnel-Reminder': 'true' };

      const safeFetch = async (url: string) => {
        try {
          const res = await fetch(url, { headers });
          if (res.status === 401) { router.push('/admin/login'); return null; }
          const text = await res.text();
          if (text.includes('<!DOCTYPE')) return null;
          return JSON.parse(text);
        } catch (e) { return null; }
      };

      const [metr, offr, sess, sys, sett, ledg, ana, sitList, alrts, bckps, glob, spd, devCon, conStat, conHist, lat] = await Promise.all([
        safeFetch(`/api/admin/metrics?siteId=${selectedSite}`),
        safeFetch(`/api/admin/offers?siteId=${selectedSite}`),
        safeFetch(`/api/admin/router/active-users?siteId=${selectedSite}`),
        safeFetch(`/api/admin/router/system-info?siteId=${selectedSite}`),
        safeFetch('/api/admin/settings'),
        safeFetch(`/api/admin/ledger?siteId=${selectedSite}`),
        safeFetch(`/api/admin/analytics/revenue?siteId=${selectedSite}`),
        safeFetch('/api/admin/sites'),
        safeFetch(`/api/admin/alerts?siteId=${selectedSite}`),
        safeFetch(`/api/admin/backup?siteId=${selectedSite}`),
        safeFetch('/api/admin/analytics/global'),
        safeFetch('/api/admin/network/speedtest'),
        safeFetch(`/api/device-connection?action=active&siteId=${selectedSite}`),
        safeFetch(`/api/device-connection?action=stats&siteId=${selectedSite}`),
        safeFetch(`/api/device-connection?action=history&siteId=${selectedSite}`),
        safeFetch(`/api/admin/network/ping?siteId=${selectedSite}`)
      ]);

      if (metr) setMetrics(metr);
      if (offr) setOffers(offr);
      if (sess) setActiveSessions(sess);
      if (sett) setSystemSettings(sett);
      if (ledg) setLedger(ledg);
      if (devCon) setDeviceConnections(devCon.devices || []);
      if (conStat) setConnectionStats(conStat);
      if (conHist) setConnectionHistory(conHist.devices || []);
      if (lat) setLatencyLogs(lat);
      if (ana) setAnalytics(ana);
      if (sitList) setSites(sitList);
      if (alrts) setSecurityAlerts(alrts);
      if (bckps) setBackups(bckps);
      if (glob) setGlobalStats(glob);
      if (spd) setSpeedLogs(spd);

      if (sys && !sys.error) {
        setRouterInfo({
          cpu: parseInt(sys['cpu-load']) || 0,
          memory: sys['free-memory'] ? `${(parseInt(sys['free-memory']) / (1024 * 1024)).toFixed(1)} MB` : '0 MB',
          uptime: sys.uptime || '0s',
          isOnline: true,
          boardName: sys['board-name'] || 'RouterBoard',
          version: sys.version || '7.x',
          model: sys.model || 'Unknown',
          name: sys.name || 'MikroTik'
        });
      } else {
        setRouterInfo((prev: any) => ({ ...prev, isOnline: false }));
      }
    } catch (err) { console.error("Refresh error:", err); }
    finally { setLoading(false); }
  }, [selectedSite, router]);

  useEffect(() => { fetchData(true); }, [fetchData]);
  useEffect(() => { const int = setInterval(() => fetchData(false), 20000); return () => clearInterval(int); }, [fetchData]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemSettings)
      });
      if (res.ok) alert("✅ Announcement Published Successfully!");
      else alert("❌ Failed to publish notice.");
    } catch (err) { alert("❌ Error connecting to server."); }
    finally { setActionLoading(false); }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/offers', {
        method: formData.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, siteId: selectedSite, maxDevices: parseInt(formData.max_devices) })
      });
      if (res.ok) {
        alert("✅ Package Saved to Cloud!");
        setFormData({ id: '', name: '', durationMin: '60', price: '', download_limit: '5M', upload_limit: '5M', data_limit_mb: '', max_devices: '1', expiry_mode: 'CONTINUOUS' });
        fetchData(false);
      } else alert("❌ Error saving plan.");
    } catch (err) { alert("❌ Connection failed."); }
    finally { setActionLoading(false); }
  };

  const handleKickUser = async (username: string) => {
    if(!confirm(`Disconnect user: ${username}?`)) return;
    try {
      await fetch('/api/admin/router/kick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, siteId: selectedSite })
      });
      fetchData(false);
    } catch (e) { alert("Action failed."); }
  };

  const handleCreateBackup = async () => {
    setActionLoading(true);
    try {
        const res = await fetch(`/api/admin/backup?siteId=${selectedSite}`, { method: 'POST' });
        if (res.ok) { alert("✅ Cloud Backup Successful!"); fetchData(false); }
        else alert("❌ Backup failed.");
    } catch (e) { alert("Network error."); }
    finally { setActionLoading(false); }
  };

  const handleScanSecurity = async () => {
    setActionLoading(true);
    try {
        const res = await fetch(`/api/admin/network/scan-rogue?siteId=${selectedSite}`, { method: 'POST' });
        if (res.ok) { alert("✅ Airspace Scan Complete!"); fetchData(false); }
        else alert("❌ Scan failed.");
    } catch (e) { alert("Network error."); }
    finally { setActionLoading(false); }
  };

  const handleExtendTime = async (voucherCode: string) => {
    const mins = prompt("Add minutes (e.g. 30):", "30");
    if (!mins) return;
    try {
      await fetch('/api/admin/router/extend-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voucherCode, minutes: parseInt(mins), siteId: selectedSite })
      });
      fetchData(false);
    } catch (e) {}
  };

  const handleRunSpeedTest = async () => {
    setActionLoading(true);
    try {
        const res = await fetch('/api/admin/network/speedtest', { method: 'POST' });
        if (res.ok) fetchData(false);
    } catch (e) {}
    finally { setActionLoading(false); }
  };

  const handleReconcile = async () => {
    const ref = prompt("Enter Transaction Reference:");
    if (!ref) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference: ref, siteId: selectedSite })
      });
      if (res.ok) { alert("✅ Success! Session provisioned."); fetchData(false); }
      else alert("❌ Transaction not found or used.");
    } catch (e) { alert("Network error."); }
    finally { setActionLoading(false); }
  };

  const handleGenerateBulk = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
        const res = await fetch('/api/admin/vouchers/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ package_id: bulkGen.package_id, batch_size: bulkGen.batch_size, siteId: selectedSite })
        });
        const data = await res.json();
        if (res.ok) { setGeneratedBatch(data.vouchers); alert(`✅ ${data.count} Vouchers Generated!`); }
        else alert(`❌ Error: ${data.error}`);
    } catch (e) { alert("Network error."); }
    finally { setActionLoading(false); }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchData(false);
      else alert("❌ Delete failed.");
    } catch (err) { alert("❌ Network error."); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col items-center justify-center gap-6">
      <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      <div className="text-white text-sm font-black uppercase tracking-[0.3em] animate-pulse">STARLINKNET CLOUD SYNC</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] text-gray-100 p-6 font-sans">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 no-print">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-xl shadow-indigo-500/20"><LayoutDashboard className="w-8 h-8 text-white" /></div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">STARLINKNET <span className="text-indigo-500">WIFI</span></h1>
              <div className="flex items-center gap-3 mt-1">
                  <select value={selectedSite} onChange={(e) => setSelectedSite(e.target.value)} className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase text-indigo-400 outline-none">
                      <option value="default-site">Main Operations</option>
                      {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${routerInfo.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      {routerInfo.isOnline ? 'Live Link' : 'System Offline'}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/admin/router/test-connection?siteId=${selectedSite}`);
                        const data = await res.json();
                        if (data.success) alert(`✅ ${data.message}`);
                        else alert(`❌ ${data.error}\n\nTip: ${data.tip}`);
                        fetchData(false);
                      } catch (err) { alert("❌ API unreachable"); }
                    }}
                    className="text-[8px] bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded border border-gray-700 font-black uppercase text-indigo-400"
                  >Test Link</button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex-1 md:flex-none flex gap-6 px-6 py-3 bg-[#11141b] rounded-2xl border border-gray-800 shadow-inner">
               <div><p className="text-[8px] text-gray-500 font-black uppercase mb-0.5">Revenue</p><p className="text-sm font-black text-emerald-400">KES {metrics.totalRevenue || 0}</p></div>
               <div className="w-px bg-gray-800" />
               <div><p className="text-[8px] text-gray-500 font-black uppercase mb-0.5">Active</p><p className="text-sm font-black text-indigo-400">{activeSessions.length}</p></div>
               <div className="w-px bg-gray-800" />
               <div><p className="text-[8px] text-gray-500 font-black uppercase mb-0.5">Devices</p><p className="text-sm font-black text-amber-400">{metrics.totalRegisteredDevices || 0}</p></div>
            </div>
            <button onClick={() => setShowBulkScreen(!showBulkScreen)} className="bg-gray-800 p-3.5 rounded-xl hover:bg-gray-700 transition-all border border-gray-800">
              {showBulkScreen ? <LayoutDashboard className="w-5 h-5 text-gray-400" /> : <Printer className="w-5 h-5 text-gray-400" />}
            </button>
            <button onClick={() => router.push('/admin/login')} className="bg-[#1a1d25] p-3.5 rounded-xl hover:text-red-400 border border-gray-800"><LogOut className="w-5 h-5" /></button>
          </div>
        </header>

        {!showBulkScreen ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-3xl text-white border border-white/5 relative overflow-hidden">
                    <p className="text-[10px] opacity-70 uppercase tracking-widest font-black">Gross Revenue</p>
                    <h3 className="text-4xl font-black mt-2">KSh {metrics?.totalRevenue?.toLocaleString() || '0'}</h3>
                    <TrendingUp className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12" />
                </div>
                <div className="bg-[#11141b] p-6 rounded-3xl border border-gray-800 relative overflow-hidden">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Network Reach</p>
                    <div className="flex items-end gap-2 mt-2">
                        <h3 className="text-4xl font-black text-white">{metrics.totalRegisteredDevices || 0}</h3>
                        <Smartphone className="w-5 h-5 text-amber-500 mb-1" />
                    </div>
                    <p className="text-[9px] mt-2 text-gray-600 font-bold uppercase">Total Unique Registered Devices</p>
                </div>
                <div className="bg-[#11141b] p-6 rounded-3xl border border-gray-800 shadow-lg group hover:border-indigo-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Router Identity</p>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${routerInfo.isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{routerInfo.isOnline ? 'Synced' : 'Offline'}</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <div><h4 className="text-xl font-black text-white uppercase tracking-tighter">{routerInfo.boardName || 'Hardware'}</h4><p className="text-[9px] text-gray-600 font-bold uppercase">Uptime: {routerInfo.uptime || '0s'}</p></div>
                            <div className="text-right"><p className="text-[8px] text-gray-500 uppercase font-black">CPU Load</p><p className={`text-xs font-black ${routerInfo.cpu > 80 ? 'text-red-500' : 'text-emerald-500'}`}>{routerInfo.cpu}%</p></div>
                        </div>
                        <div className="w-full bg-gray-950 h-1.5 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${routerInfo.cpu > 80 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${routerInfo.cpu}%` }} /></div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button onClick={handleRunSpeedTest} className="bg-[#11141b] p-4 rounded-2xl border border-gray-800 hover:border-indigo-500/50 flex items-center gap-3"><Zap className="w-5 h-5 text-amber-500" /><div className="text-left"><p className="text-[10px] font-black uppercase text-white">Speed Test</p></div></button>
              <button onClick={handleScanSecurity} className="bg-[#11141b] p-4 rounded-2xl border border-gray-800 hover:border-red-500/50 flex items-center gap-3"><ShieldAlert className="w-5 h-5 text-red-500" /><div className="text-left"><p className="text-[10px] font-black uppercase text-white">Security</p></div></button>
              <button onClick={handleCreateBackup} className="bg-[#11141b] p-4 rounded-2xl border border-gray-800 hover:border-emerald-500/50 flex items-center gap-3"><Database className="w-5 h-5 text-emerald-500" /><div className="text-left"><p className="text-[10px] font-black uppercase text-white">Backup</p></div></button>
              <button onClick={handleReconcile} className="bg-[#11141b] p-4 rounded-2xl border border-gray-800 hover:border-indigo-500/50 flex items-center gap-3"><ArrowUpRight className="w-5 h-5 text-indigo-500" /><div className="text-left"><p className="text-[10px] font-black uppercase text-white">Reconcile</p></div></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                  <form onSubmit={handleCreateOffer} className="bg-[#11141b] p-6 rounded-3xl border border-gray-800 shadow-2xl relative">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 border-b border-gray-800 pb-3">Package Creator</h3>
                      <div className="space-y-4">
                          <input type="text" placeholder="Pass Name (e.g. 1HR SUPER)" className="w-full bg-gray-950 border border-gray-800 p-3.5 rounded-2xl text-white text-xs" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value.toUpperCase()})} required />
                          <div className="grid grid-cols-2 gap-3">
                              <input type="number" placeholder="Price (KES)" className="w-full bg-gray-950 border border-gray-800 p-3.5 rounded-2xl text-white text-xs" value={formData.price} onChange={e=>setFormData({...formData, price:e.target.value})} required />
                              <input type="number" placeholder="Mins" className="w-full bg-gray-950 border border-gray-800 p-3.5 rounded-2xl text-white text-xs" value={formData.durationMin} onChange={e=>setFormData({...formData, durationMin:e.target.value})} required />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                              <input type="text" placeholder="Down (5M)" className="w-full bg-gray-950 border border-gray-800 p-3.5 rounded-2xl text-white text-xs" value={formData.download_limit} onChange={e=>setFormData({...formData, download_limit:e.target.value})} required />
                              <input type="text" placeholder="Up (2M)" className="w-full bg-gray-950 border border-gray-800 p-3.5 rounded-2xl text-white text-xs" value={formData.upload_limit} onChange={e=>setFormData({...formData, upload_limit:e.target.value})} required />
                          </div>
                          <button type="submit" disabled={actionLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">{formData.id ? 'UPDATE PASS' : 'PUBLISH PASS'}</button>
                      </div>
                  </form>

                  <div className="bg-[#11141b] p-6 rounded-3xl border border-gray-800">
                      <h3 className="text-sm font-black uppercase text-white mb-6 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Network Notice</h3>
                      <textarea className="w-full bg-gray-950 border border-gray-800 p-4 rounded-2xl text-xs text-white outline-none h-24" placeholder="Emergency message for users..." value={systemSettings.bannerText} onChange={e => setSystemSettings({...systemSettings, bannerText: e.target.value})} />
                      <div className="flex gap-2 mt-3">
                          <select className="bg-gray-950 border border-gray-800 p-2 rounded-xl text-[10px] font-black uppercase text-indigo-400" value={systemSettings.bannerType} onChange={e => setSystemSettings({...systemSettings, bannerType: e.target.value})}>
                              <option value="info">Purple</option><option value="warning">Amber</option><option value="maintenance">Red</option>
                          </select>
                          <button onClick={handleUpdateSettings} disabled={actionLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 p-3 rounded-xl font-black text-[10px] uppercase">Publish Notice</button>
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-2 space-y-8">
                  <div className="bg-[#11141b] p-8 rounded-3xl border border-gray-800 shadow-2xl min-h-[400px]">
                      <h3 className="text-sm font-black flex items-center gap-2 uppercase text-white mb-8 tracking-widest"><Users className="w-5 h-5 text-indigo-500" /> Live Leases</h3>
                      <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                              <thead className="bg-gray-950/50 text-[9px] text-gray-600 uppercase font-black border-b border-gray-800">
                                  <tr><th className="p-4 uppercase tracking-widest">User / Identity</th><th className="p-4 uppercase tracking-widest">Connected</th><th className="p-4 text-right uppercase tracking-widest">Action</th></tr>
                              </thead>
                              <tbody>
                                  {activeSessions?.map(s => (
                                      <tr key={s.id} className="border-b border-gray-800/30 hover:bg-indigo-500/5 transition-all">
                                          <td className="p-4"><p className="text-indigo-400 font-bold text-sm">{s.voucherCode}</p><p className="text-[8px] font-black opacity-40 uppercase tracking-tighter">{s.macAddress}</p></td>
                                          <td className="p-4 text-emerald-400 font-black tracking-widest uppercase">{s.uptime}</td>
                                          <td className="p-4 text-right"><button onClick={() => handleKickUser(s.voucherCode)} className="bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase">KICK</button></td>
                                      </tr>
                                  ))}
                                  {activeSessions.length === 0 && <tr><td colSpan={3} className="p-20 text-center text-gray-700 italic font-black uppercase tracking-widest">Awaiting Connections</td></tr>}
                              </tbody>
                          </table>
                      </div>
                  </div>

                  <div className="bg-[#11141b] p-6 rounded-3xl border border-gray-800">
                    <h3 className="text-sm font-black uppercase text-white mb-6">Current Passes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {offers.map(o => (
                            <div key={o.id} className="bg-gray-950 p-4 rounded-2xl border border-gray-800 flex justify-between items-center group hover:border-indigo-500/50 transition-all">
                                <div><p className="font-bold text-white uppercase text-xs tracking-tighter">{o.name}</p><p className="text-[10px] text-gray-500 font-black">{o.price} KES | {o.durationMin} MINS</p></div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleDeleteOffer(o.id)} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg"><XCircle className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                  </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#11141b] p-10 rounded-3xl border border-gray-800 shadow-2xl max-w-5xl mx-auto">
              <h2 className="text-2xl font-black mb-6 text-white uppercase tracking-tighter">Bulk Voucher matrix</h2>
              <form onSubmit={handleGenerateBulk} className="flex flex-col md:flex-row gap-6 bg-gray-950 p-8 rounded-3xl mb-10 border border-gray-800">
                  <div className="flex-1">
                      <label className="text-[10px] text-gray-600 font-black uppercase mb-3 block">Package Tier</label>
                      <select className="w-full bg-[#1a1d25] border border-gray-800 p-4 rounded-2xl text-white outline-none focus:border-indigo-500" value={bulkGen.package_id} onChange={e => setBulkGen({...bulkGen, package_id: e.target.value})} required>
                          <option value="">-- Choose Plan --</option>
                          {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                  </div>
                  <div className="md:w-32">
                      <label className="text-[10px] text-gray-600 font-black uppercase mb-3 block">Batch size</label>
                      <input type="number" className="w-full bg-[#1a1d25] border border-gray-800 p-4 rounded-2xl text-white outline-none" value={bulkGen.batch_size} onChange={e => setBulkGen({...bulkGen, batch_size: e.target.value})} required />
                  </div>
                  <button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-500 px-10 rounded-2xl font-black uppercase text-[10px] h-[53px] self-end tracking-widest shadow-xl">Generate</button>
              </form>

              {generatedBatch.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-8 bg-white rounded-3xl">
                      {generatedBatch.map((v, i) => (
                          <div key={i} className="border-2 border-dashed border-indigo-100 p-5 text-center rounded-2xl text-black">
                              <p className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">STARLINKNET</p>
                              <p className="text-2xl font-mono font-black border-y-2 border-indigo-50 my-2 py-2">{v.code}</p>
                              <p className="text-[7px] font-black text-gray-400 uppercase">{v.packageName}</p>
                          </div>
                      ))}
                  </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}
