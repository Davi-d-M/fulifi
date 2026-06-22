'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  XCircle,
  Zap
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
          if (text.includes('<!DOCTYPE')) return null;
          return JSON.parse(text);
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
          uptime: sys.uptime || '0s',
          isOnline: true
        });
      } else {
        setRouterInfo(prev => ({ ...prev, isOnline: false }));
      }
    } catch (err) { console.error("Dashboard error:", err); } finally { setLoading(false); }
  }, [selectedSite, router]);

  useEffect(() => { fetchData(true); }, [fetchData]);
  useEffect(() => { const int = setInterval(() => fetchData(false), 20000); return () => clearInterval(int); }, [fetchData]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/offers', {
        method: formData.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, siteId: selectedSite })
      });
      if (res.ok) {
        setFormData({id:'', name:'', duration:'', durationMin:'60', price:'', download_limit:'5M', upload_limit:'5M', data_limit_mb: '', max_devices:'1', expiry_mode:'CONTINUOUS'});
        alert("Success: Offer saved.");
        await fetchData(false);
      } else {
        alert("Error saving offer");
      }
    } catch (err) { alert("Connection Error"); }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    try {
      const res = await fetch('/api/admin/offers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) await fetchData(false);
    } catch (err) { alert("Error deleting"); }
  };

  const handleEditOffer = (offer: any) => {
    setFormData({
      id: offer.id,
      name: offer.name,
      duration: offer.duration || '',
      durationMin: offer.durationMin?.toString() || '60',
      price: offer.price?.toString() || '',
      download_limit: offer.downloadLimit || '5M',
      upload_limit: offer.uploadLimit || '5M',
      data_limit_mb: offer.dataLimitMB?.toString() || '',
      max_devices: (offer.maxDevices || 1).toString(),
      expiry_mode: offer.expiryMode || 'CONTINUOUS',
    });
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemSettings)
      });
      if (res.ok) {
        await fetch('/api/admin/system/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blockTethering: systemSettings.blockTethering })
        });
        alert("Announcement Published!");
      }
    } catch (err) { alert("Error updating settings"); }
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Total Revenue</p>
            <h3 className="text-4xl font-black mt-2">KSh {analytics?.totalRevenue || metrics?.totalRevenue || 0}</h3>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Active Leases</p>
            <h3 className="text-4xl font-black mt-2 text-white">{(activeSessions || []).length}</h3>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">System Link</p>
            <div className="mt-3 flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${routerInfo.isOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
              <span className={`text-xl font-black ${routerInfo.isOnline ? 'text-emerald-400' : 'text-red-400'} uppercase`}>{routerInfo.isOnline ? 'SYNCED' : 'DISCONNECTED'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <form onSubmit={handleUpdateSettings} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-gray-700 pb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Announcements</h3>
                    <textarea
                        className="w-full bg-gray-900 border border-gray-700 p-3 rounded-lg text-xs text-white outline-none focus:border-indigo-500 min-h-[80px]"
                        placeholder="Live portal message..."
                        value={systemSettings.bannerText}
                        onChange={e => setSystemSettings({...systemSettings, bannerText: e.target.value})}
                    />
                    <div className="flex gap-2">
                        <select className="bg-gray-900 border border-gray-700 p-2 rounded-lg text-xs text-white flex-1" value={systemSettings.bannerType} onChange={e => setSystemSettings({...systemSettings, bannerType: e.target.value})}>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="maintenance">Danger</option>
                        </select>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-black text-[10px] uppercase">Publish</button>
                    </div>
                </form>

                <form onSubmit={handleCreateOffer} className="bg-gray-800 p-6 rounded-2xl border border-gray-700 space-y-4 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white border-b border-gray-700 pb-2">{formData.id ? 'Edit Plan' : 'Add Plan'}</h3>
                    <input type="text" placeholder="Name" className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg text-xs text-white" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required />
                    <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Price" className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg text-xs text-white" value={formData.price} onChange={e=>setFormData({...formData, price:e.target.value})} required />
                        <input type="number" placeholder="Mins" className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg text-xs text-white" value={formData.durationMin} onChange={e=>setFormData({...formData, durationMin:e.target.value})} required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Download (5M)" className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg text-xs text-white" value={formData.download_limit} onChange={e=>setFormData({...formData, download_limit:e.target.value})} />
                        <input type="text" placeholder="Upload (5M)" className="w-full bg-gray-900 border border-gray-700 p-2 rounded-lg text-xs text-white" value={formData.upload_limit} onChange={e=>setFormData({...formData, upload_limit:e.target.value})} />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 p-3 rounded-lg font-black text-xs uppercase">{formData.id ? 'Update Plan' : 'Save Plan'}</button>
                    {formData.id && <button type="button" onClick={() => setFormData({id:'', name:'', duration:'', durationMin:'60', price:'', download_limit:'5M', upload_limit:'5M', data_limit_mb: '', max_devices:'1', expiry_mode:'CONTINUOUS'})} className="w-full bg-gray-700 p-2 rounded-lg text-[10px] uppercase">Cancel</button>}
                </form>
            </div>

            <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Billing Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {offers.map(o => (
                            <div key={o.id} className="bg-gray-900 p-4 rounded-xl border border-gray-700 flex justify-between items-center group">
                                <div>
                                    <p className="font-bold text-white">{o.name}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-black">{o.price} KES | {o.durationMin} MINS</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditOffer(o)} className="p-2 hover:bg-gray-800 rounded-lg text-indigo-400"><Settings className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteOffer(o.id)} className="p-2 hover:bg-gray-800 rounded-lg text-red-400"><XCircle className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white mb-4">Live Hardware Leases</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-[10px] text-gray-500 uppercase font-black border-b border-gray-700">
                                <tr><th className="p-4">User</th><th className="p-4">IP</th><th className="p-4">Uptime</th><th className="p-4"></th></tr>
                            </thead>
                            <tbody className="text-xs">
                                {activeSessions.map((s:any, idx: number) => (
                                    <tr key={idx} className="border-b border-gray-700/50">
                                        <td className="p-4 font-mono text-indigo-400">{s.user || s.voucherCode}</td>
                                        <td className="p-4 text-gray-400">{s.address || s.ipAddress}</td>
                                        <td className="p-4 text-emerald-400 font-bold">{s.uptime}</td>
                                        <td className="p-4 text-right"><button className="text-red-500 font-black uppercase text-[10px]">Kick</button></td>
                                    </tr>
                                ))}
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
