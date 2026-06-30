"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  XCircle, CheckCircle2, Zap, ShieldAlert,
  Monitor, Gift, Phone, Info, Globe, ChevronRight
} from 'lucide-react';

export default function PayPage() {
  const [view, setView] = useState<'landing' | 'checkout' | 'waiting' | 'success'>('landing');
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [bundlePlans, setBundlePlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [systemBanner, setSystemBanner] = useState<{ text: string, type: string } | null>(null);
  const [purchasedVoucher, setPurchasedVoucher] = useState("");
  const [countdown, setCountdown] = useState(60);

  // Advanced Feature States
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [rebindValue, setRebindValue] = useState("");
  const [showRebind, setShowRebind] = useState(false);
  const [showRefer, setShowRefer] = useState(false);
  const [referPhone, setReferPhone] = useState("");
  const [showTvConnect, setShowTvConnect] = useState(false);
  const [tvMac, setTvMac] = useState("");

  // Router variables
  const [mac, setMac] = useState("");
  const [ip, setIp] = useState("");
  const [siteId, setSiteId] = useState("default-site");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMac = params.get('mac') || localStorage.getItem('last_mac') || "";
    const urlIp = params.get('ip') || localStorage.getItem('last_ip') || "";
    let urlSiteId = params.get('siteId') || "default-site";
    if (urlSiteId.includes('$')) urlSiteId = "default-site";

    setMac(urlMac); setIp(urlIp); setSiteId(urlSiteId);
    if (urlMac) localStorage.setItem('last_mac', urlMac);

    const reference = params.get('reference') || params.get('trxref');
    if (reference) {
      setView('waiting');
      pollVerification(reference);
    }

    const fetchPlans = async () => {
      try {
        const res = await fetch(`/api/admin/offers?siteId=${urlSiteId}`, {
            headers: { 'ngrok-skip-browser-warning': 'true', 'Bypass-Tunnel-Reminder': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setBundlePlans(data);
        }
      } catch (err) {} finally { setFetching(false); }
    };
    fetchPlans();

    const fetchBanner = async () => {
      try {
        const res = await fetch('/api/admin/settings', { headers: { 'ngrok-skip-browser-warning': 'true', 'Bypass-Tunnel-Reminder': 'true' } });
        const data = await res.json();
        if (data && data.bannerText) setSystemBanner({ text: data.bannerText, type: data.bannerType });
      } catch (err) {}
    };
    fetchBanner();

    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (view === 'waiting' && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [view, countdown]);

  const submitLogin = (code: string) => {
    const params = new URLSearchParams(window.location.search);
    const url = params.get('link-login') || params.get('link-login-only');
    if (!url) return;
    const form = document.createElement('form');
    form.method = 'POST'; form.action = url;
    const u = document.createElement('input'); u.type='hidden'; u.name='username'; u.value=code;
    const p = document.createElement('input'); p.type='hidden'; p.name='password'; p.value=code;
    const d = document.createElement('input'); d.type='hidden'; d.name='dst'; d.value=params.get('link-orig') || 'http://google.com';
    form.appendChild(u); form.appendChild(p); form.appendChild(d);
    document.body.appendChild(form); form.submit();
  };

  const pollVerification = async (ref: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    const check = async () => {
      try {
        const res = await fetch(`/api/pay/verify?reference=${ref}`);
        const data = await res.json();
        if (data.success) {
          setPurchasedVoucher(data.voucherCode);
          setView('success');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => submitLogin(data.voucherCode), 2000);
        } else if (data.status === 'failed') {
          setStatus({ success: false, message: "Payment failed." });
          setView('landing');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (e) {}
    };
    pollIntervalRef.current = setInterval(check, 3000);
    check();
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setLoading(true); setStatus(null);
    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, email, packageId: selectedPlan.id, mac, ip, siteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      if (data.status === "success" && data.authorization_url) window.location.href = data.authorization_url;
    } catch (err: any) {
      setStatus({ success: false, message: err.message });
      setLoading(false);
    }
  };

  const handleFreeTrial = async () => {
    if (loading) return;
    if (!mac) {
        setStatus({ success: false, message: "⚠️ Device ID missing. Reconnect Wi-Fi." });
        return;
    }
    setLoading(true); setStatus(null);
    try {
        const res = await fetch('/api/pay/free-trial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mac, ip, siteId }),
        });
        const data = await res.json();
        if (res.ok) {
            setPurchasedVoucher(data.voucherCode);
            setStatus({ success: true, message: "Free trial activated!" });
            setTimeout(() => { setView('success'); submitLogin(data.voucherCode); }, 1500);
        } else setStatus({ success: false, message: data.error || "Trial limit reached." });
    } catch (e) { setStatus({ success: false, message: "Trial failed." }); }
    finally { setLoading(false); }
  };

  const handleVerifyVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode) return;
    setLoading(true); setStatus(null);
    try {
      const res = await fetch('/api/portal/verify-voucher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputCode: voucherCode, macAddress: mac, ipAddress: ip, siteId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus({ success: true, message: "Connected!" });
        submitLogin(voucherCode);
      } else throw new Error(data.message || "Invalid code");
    } catch (err: any) {
      setStatus({ success: false, message: err.message });
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!rebindValue) return;
    setCheckingStatus(true);
    try {
      const res = await fetch(`/api/auth/status?id=${rebindValue}&siteId=${siteId}`);
      const data = await res.json();
      if (data.active) setStatusInfo(data);
      else alert("No active session.");
    } catch (e) {} finally { setCheckingStatus(false); }
  };

  const handleRebind = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setStatus(null);
    try {
      const res = await fetch('/api/auth/rebind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherCode: rebindValue.length > 10 ? undefined : rebindValue,
          phoneNumber: rebindValue.length > 10 ? rebindValue : undefined,
          mac, ip, siteId
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ success: true, message: "Restored! Reconnecting..." });
        setTimeout(() => submitLogin(data.voucherCode), 2000);
      } else setStatus({ success: false, message: data.error || "No session." });
    } catch (err: any) {} finally { setLoading(false); }
  };

  const handleTvConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tvMac || !purchasedVoucher) return;
    setLoading(true);
    try {
        const res = await fetch('/api/auth/connect-tv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tvMac, voucherCode: purchasedVoucher, siteId }),
        });
        if (res.ok) { alert("📺 TV Connected!"); setShowTvConnect(false); }
    } catch (e) {} finally { setLoading(false); }
  };

  const handleReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchasedVoucher || !referPhone) return;
    setLoading(true);
    try {
        const res = await fetch('/api/refer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referrerVoucher: purchasedVoucher, referredPhone: referPhone }),
        });
        if (res.ok) { alert("✅ Success!"); setShowRefer(false); }
    } catch (e) {} finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f3f4f6", fontFamily: "system-ui, sans-serif", padding: "20px" }}>
      <div style={{ backgroundColor: "#ffffff", padding: "32px", borderRadius: "24px", boxShadow: "0 10px 40px rgba(0, 0, 0, 0.05)", width: "100%", maxWidth: "480px" }}>

        {systemBanner && (
          <div style={{ backgroundColor: "#f0f9ff", padding: "12px", borderRadius: "14px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px", border: "1px solid #bae6fd" }}>
            <Zap size={16} color="#0ea5e9" />
            <p style={{ color: "#0369a1", fontSize: "12px", fontWeight: "600", margin: 0 }}>{systemBanner.text}</p>
          </div>
        )}

        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h2 style={{ margin: 0, color: "#111827", fontSize: "32px", fontWeight: "900", letterSpacing: "-1.5px" }}>Starlinknet.<span style={{ color: "#4f46e5" }}>WIFI</span></h2>
          {!mac && <div style={{ color: "#ef4444", fontSize: "11px", fontWeight: "600", marginTop: "12px", padding: "8px", backgroundColor: "#fff1f2", borderRadius: "8px" }}>⚠️ DEVICE ID MISSING. RECONNECT WI-FI.</div>}
        </div>

        {view === 'success' ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
                <CheckCircle2 style={{ color: "#10b981", width: "64px", height: "64px", marginBottom: "20px" }} />
                <h1 style={{ fontSize: "24px", fontWeight: "900" }}>Access Granted!</h1>
                <p style={{ color: "#334155", marginBottom: "24px", fontWeight: "400" }}>Connecting you now...</p>
                <div style={{ backgroundColor: "#f8fafc", padding: "20px", borderRadius: "16px", fontSize: "28px", fontWeight: "600", letterSpacing: "4px", border: "1px solid #e2e8f0", color: "#111827" }}>{purchasedVoucher}</div>

                <div style={{ marginTop: "32px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {!showTvConnect ? (
                        <button onClick={() => setShowTvConnect(true)} style={{ width: "100%", backgroundColor: "#1e293b", color: "#fff", padding: "14px", borderRadius: "12px", border: "none", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>📺 Connect a Smart TV</button>
                    ) : (
                        <form onSubmit={handleTvConnect} style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                            <input type="text" placeholder="TV MAC Address" value={tvMac} onChange={e => setTvMac(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", marginBottom: "10px", outline: "none" }} required />
                            <button type="submit" style={{ width: "100%", backgroundColor: "#334155", color: "white", padding: "12px", borderRadius: "10px", border: "none", fontWeight: "600" }}>Connect TV</button>
                        </form>
                    )}
                    {!showRefer ? (
                        <button onClick={() => setShowRefer(true)} style={{ width: "100%", backgroundColor: "#f5f3ff", color: "#6366f1", padding: "14px", borderRadius: "12px", border: "1px solid #e0e7ff", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>🎁 Gift 30 mins to a Friend</button>
                    ) : (
                        <form onSubmit={handleReferral} style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input type="tel" placeholder="07XXXXXXXX" value={referPhone} onChange={e => setReferPhone(e.target.value)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "14px" }} required />
                                <button type="submit" style={{ backgroundColor: "#6366f1", color: "white", padding: "12px 20px", borderRadius: "10px", border: "none", fontWeight: "600" }}>Send</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        ) : view === 'waiting' ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div className="spinner"></div>
                <h3 style={{ marginTop: "24px", fontWeight: "600", fontSize: "22px", color: "#111827" }}>Confirm Payment</h3>
                <div style={{ fontSize: "48px", fontWeight: "600", color: "#4f46e5", margin: "24px 0" }}>00:{countdown.toString().padStart(2, '0')}</div>
                <button onClick={() => setView('landing')} style={{ width: "100%", background: "none", border: "none", color: "#334155", fontWeight: "400", cursor: "pointer" }}>Cancel</button>
            </div>
        ) : (
            <>
                <div style={{ display: "flex", gap: "8px", marginBottom: "24px", backgroundColor: "#f1f5f9", padding: "6px", borderRadius: "14px" }}>
                    <button onClick={() => { setShowVoucherInput(false); setShowRebind(false); }} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", backgroundColor: !showVoucherInput && !showRebind ? "#ffffff" : "transparent", color: "#111827", fontWeight: "600", cursor: "pointer" }}>Buy Bundle</button>
                    <button onClick={() => { setShowVoucherInput(true); setShowRebind(false); }} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "none", backgroundColor: showVoucherInput ? "#ffffff" : "transparent", color: "#111827", fontWeight: "600", cursor: "pointer" }}>Use Voucher</button>
                </div>

                {!showVoucherInput && !showRebind ? (
                <form onSubmit={handlePayment} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto", padding: "2px" }}>
                        {bundlePlans.map((plan) => (
                            <div key={plan.id} onClick={() => setSelectedPlan(plan)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px", borderRadius: "16px", border: selectedPlan?.id === plan.id ? "2.5px solid #4f46e5" : "1.5px solid #f1f5f9", backgroundColor: selectedPlan?.id === plan.id ? "#f5f3ff" : "#ffffff", cursor: "pointer" }}>
                                <div>
                                    <div style={{ fontWeight: "600", fontSize: "16px", color: "#111827" }}>{plan.name}</div>
                                    <div style={{ fontSize: "11px", color: "#334155", fontWeight: "400", marginTop: "2px" }}>{plan.duration} | HIGH SPEED</div>
                                </div>
                                <div style={{ fontWeight: "700", fontSize: "18px", color: "#111827" }}>{plan.price} KES</div>
                            </div>
                        ))}
                    </div>
                    {selectedPlan && (
                        <div style={{ marginTop: "10px", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "20px", border: "1px solid #f1f5f9" }}>
                            <input type="email" placeholder="Email (Optional)" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "14px", marginBottom: "10px", boxSizing: "border-box", fontWeight: "400", color: "#1e293b" }} />
                            <input type="tel" required placeholder="M-Pesa Phone Number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "14px", marginBottom: "12px", boxSizing: "border-box", fontWeight: "400", color: "#1e293b" }} />
                            <button type="submit" disabled={loading} style={{ width: "100%", backgroundColor: "#111827", color: "#ffffff", padding: "18px", borderRadius: "12px", border: "none", fontSize: "16px", fontWeight: "700", cursor: "pointer" }}>{loading ? "INITIALIZING..." : `PAY KES ${selectedPlan.price}`}</button>
                        </div>
                    )}
                    <button type="button" onClick={() => setShowRebind(true)} style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "13px", fontWeight: "600", marginTop: "16px", cursor: "pointer" }}>Already paid? Check Balance</button>
                </form>
                ) : showVoucherInput ? (
                <form onSubmit={handleVerifyVoucher} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <input type="text" required placeholder="ENTER VOUCHER PIN" value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} style={{ width: "100%", padding: "16px", borderRadius: "14px", border: "1.5px solid #f1f5f9", fontSize: "18px", fontWeight: "600", letterSpacing: "2px", textAlign: "center", backgroundColor: "#f8fafc", boxSizing: "border-box", color: "#1e293b" }} />
                    <button type="submit" disabled={loading || !voucherCode} style={{ width: "100%", backgroundColor: "#4f46e5", color: "#ffffff", padding: "18px", borderRadius: "14px", border: "none", fontSize: "16px", fontWeight: "700", cursor: "pointer" }}>CONNECT NOW</button>
                </form>
                ) : (
                <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "12px", color: "#334155", marginBottom: "12px", fontWeight: "400" }}>Enter Code or Phone to resume session</p>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        <input type="text" placeholder="Code or Phone" value={rebindValue} onChange={e => setRebindValue(e.target.value)} style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #f1f5f9", fontSize: "14px", fontWeight: "400", outline: "none", color: "#1e293b" }} />
                        <button onClick={handleCheckStatus} disabled={checkingStatus} style={{ backgroundColor: "#f1f5f9", color: "#1e293b", padding: "12px 20px", borderRadius: "10px", border: "none", fontWeight: "600", fontSize: "14px", cursor: "pointer" }}>Info</button>
                    </div>
                    {statusInfo && (
                        <div style={{ backgroundColor: "#f5f3ff", padding: "16px", borderRadius: "14px", marginBottom: "16px", border: "1px solid #e0e7ff", textAlign: "left" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#4f46e5" }}>PLAN</span>
                                <span style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b" }}>{statusInfo.packageName}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "11px", fontWeight: "600", color: "#4f46e5" }}>REMAINING</span>
                                <span style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b" }}>{statusInfo.remaining}</span>
                            </div>
                        </div>
                    )}
                    <button onClick={(e: any) => handleRebind(e)} disabled={loading} style={{ width: "100%", backgroundColor: "#6366f1", color: "white", padding: "16px", borderRadius: "12px", border: "none", fontWeight: "600", cursor: "pointer" }}>Reconnect Device</button>
                    <button onClick={() => setShowRebind(false)} style={{ marginTop: "12px", background: "none", border: "none", color: "#334155", fontSize: "11px", fontWeight: "400", cursor: "pointer" }}>Cancel</button>
                </div>
                )}

                {/* FREE TRIAL BUTTON */}
                <button onClick={handleFreeTrial} disabled={loading} style={{ width: "100%", backgroundColor: "#fff", border: "1.5px solid #f1f5f9", padding: "16px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", color: "#334155", fontWeight: "600", fontSize: "14px", marginTop: "24px", cursor: "pointer" }}>
                    <Gift size={18} color="#f59e0b" /> Try 10 Minutes for Free
                </button>
            </>
        )}

        {status && <div style={{ marginTop: "20px", padding: "14px", borderRadius: "14px", fontSize: "13px", fontWeight: "600", textAlign: "center", backgroundColor: status.success ? "#f0fdf4" : "#fff1f2", color: status.success ? "#10b981" : "#dc2626" }}>{status.message}</div>}

        <div style={{ marginTop: "32px", textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: "24px" }}>
          <p style={{ fontSize: "12px", color: "#334155", marginBottom: "12px", fontWeight: "400" }}>Need help with your connection?</p>
          <a href="tel:0769345599" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", backgroundColor: "#2563eb", color: "#ffffff", padding: "16px", borderRadius: "14px", textDecoration: "none", fontSize: "15px", fontWeight: "700" }}>
            <Phone size={18} /> Contact Customer Care
          </a>
        </div>
      </div>
      <style jsx global>{`
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f4f6; border-top: 4px solid #4f46e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
