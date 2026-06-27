"use client";

import React, { useState, useEffect, useRef } from 'react';
import { XCircle, CheckCircle2, ShieldAlert, Zap, ArrowRight, Smartphone, Wifi } from 'lucide-react';

export default function PayPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [bundlePlans, setBundlePlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [tunnelBlocked, setTunnelBlocked] = useState(false);
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isWaitingForPin, setIsWaitingForPin] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [purchasedVoucher, setPurchasedVoucher] = useState("");
  const [showRebind, setShowRebind] = useState(false);
  const [rebindValue, setRebindValue] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [activeReference, setActiveReference] = useState<string | null>(null);
  const [systemBanner, setSystemBanner] = useState<{ text: string, type: string } | null>(null);

  // Router variables
  const [mac, setMac] = useState("");
  const [ip, setIp] = useState("");
  const [siteId, setSiteId] = useState("default-site");
  const [linkLogin, setLinkLogin] = useState("");
  const [linkOrig, setLinkOrig] = useState("");

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlMac = params.get('mac') || localStorage.getItem('last_mac') || "";
    const urlIp = params.get('ip') || localStorage.getItem('last_ip') || "";
    const urlSiteId = params.get('siteId') || "default-site";

    setMac(urlMac); setIp(urlIp); setSiteId(urlSiteId);
    if (urlMac) localStorage.setItem('last_mac', urlMac);
    if (urlIp) localStorage.setItem('last_ip', urlIp);

    setLinkLogin(params.get('link-login') || params.get('link-login-only') || "");
    setLinkOrig(params.get('link-orig') || "");

    if (!urlMac && !params.get('reference')) {
        setStatus({ success: false, message: "⚠️ System cannot identify your device. Please turn Wi-Fi OFF and ON to refresh." });
    }

    const savedRef = localStorage.getItem('active_checkout_ref');
    const savedMac = localStorage.getItem('last_mac');
    if (savedRef && (!urlMac || savedMac === urlMac)) {
      setActiveReference(savedRef); setIsWaitingForPin(true); pollVerification(savedRef);
    }

    const reference = params.get('reference') || params.get('trxref');
    if (reference) {
      setActiveReference(reference); localStorage.setItem('active_checkout_ref', reference);
      if (urlMac) localStorage.setItem('last_mac', urlMac);
      setIsWaitingForPin(true); pollVerification(reference);
    }

    const fetchPlans = async () => {
      try {
        const res = await fetch(`/api/admin/offers?siteId=${urlSiteId}`, { headers: { 'ngrok-skip-browser-warning': 'true', 'Bypass-Tunnel-Reminder': 'true' } });
        const text = await res.text();
        if (text.toLowerCase().includes('<!doctype html>')) { setTunnelBlocked(true); return; }
        const data = JSON.parse(text);
        if (res.ok && Array.isArray(data)) {
          setBundlePlans(data);
          if (data.length > 0) setSelectedPlan(data[0]);
        }
      } catch (err) { console.error("Plans crash:", err); } finally { setFetching(false); }
    };
    fetchPlans();

    const fetchBanner = async () => {
      try {
        const res = await fetch('/api/admin/settings', { headers: { 'ngrok-skip-browser-warning': 'true', 'Bypass-Tunnel-Reminder': 'true' } });
        const data = await res.json();
        if (data && data.bannerText && data.bannerText.trim() !== "") setSystemBanner({ text: data.bannerText, type: data.bannerType });
      } catch (err) {}
    };
    fetchBanner();

    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isWaitingForPin && countdown > 0) timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [isWaitingForPin, countdown]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !selectedPlan) return;
    setLoading(true); setStatus(null);
    try {
      const res = await fetch('/api/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, email, packageId: selectedPlan.id, mac, ip, siteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");
      if (data.status === "success") {
        if (data.authorization_url) {
          localStorage.setItem('active_checkout_ref', data.reference);
          localStorage.setItem('last_mac', mac);
          window.location.href = data.authorization_url;
        } else {
          setActiveReference(data.reference); setIsWaitingForPin(true); setCountdown(60);
          localStorage.setItem('active_checkout_ref', data.reference);
          localStorage.setItem('last_mac', mac);
          pollVerification(data.reference);
        }
      }
    } catch (err: any) { setStatus({ success: false, message: err.message }); setLoading(false); }
  };

  const pollVerification = async (ref: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    const check = async () => {
      try {
        const res = await fetch(`/api/pay/verify?reference=${ref}`);
        const data = await res.json();
        if (data.success) {
          setPurchasedVoucher(data.voucherCode); setIsSuccess(true); setIsWaitingForPin(false);
          localStorage.removeItem('active_checkout_ref');
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setTimeout(() => loginRouter(data.voucherCode), 2000);
        } else if (data.status === 'failed') {
          setStatus({ success: false, message: `❌ Payment failed: ${data.message || 'Cancelled'}` });
          setIsWaitingForPin(false);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
      } catch (e) {}
    };
    pollIntervalRef.current = setInterval(check, 2000);
    check();
  };

  const loginRouter = (code: string) => {
    if (linkLogin) {
      const form = document.createElement('form');
      form.method = 'POST'; form.action = linkLogin;
      form.innerHTML = `<input type="hidden" name="username" value="${code}"><input type="hidden" name="password" value="${code}"><input type="hidden" name="dst" value="${linkOrig || 'http://google.com'}">`;
      document.body.appendChild(form); form.submit();
    }
  };

  const handleManualCheck = () => { if (activeReference) pollVerification(activeReference); };

  const handleRebind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mac) {
      setStatus({ success: false, message: "❌ System cannot identify your device. Please turn Wi-Fi OFF and ON again to continue." });
      return;
    }
    setLoading(true); setStatus(null);
    try {
      const res = await fetch('/api/auth/rebind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucherCode: rebindValue.length > 10 ? undefined : rebindValue, phoneNumber: rebindValue.length > 10 ? rebindValue : undefined, mac, ip, siteId }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ success: true, message: "Welcome back! Reconnecting..." });
        setTimeout(() => loginRouter(data.voucherCode), 2000);
      } else throw new Error(data.error || "Session not found");
    } catch (err: any) { setStatus({ success: false, message: err.message }); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f0f2f5", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ backgroundColor: "#ffffff", padding: "32px", width: "100%", maxWidth: "480px", display: "flex", flexDirection: "column", minHeight: "100vh", boxShadow: "0 10px 25px rgba(0,0,0,0.05)", position: "relative" }}>

        {/* BRAND LOGO */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h1 style={{ fontWeight: "900", color: "#111827", fontSize: "38px", letterSpacing: "-2.5px", margin: 0 }}>STARLINKNET.<span style={{ color: "#4f46e5" }}>WIFI</span></h1>
            <p style={{ color: "#6b7280", fontSize: "14px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px" }}>High-Speed Wireless Access</p>
        </div>

        {/* MASSIVE ANNOUNCEMENT BANNER */}
        {systemBanner && (
            <div style={{
                backgroundColor: systemBanner.type === 'maintenance' ? '#fef2f2' : systemBanner.type === 'warning' ? '#fffbeb' : '#f5f3ff',
                border: `3px solid ${systemBanner.type === 'maintenance' ? '#ef4444' : systemBanner.type === 'warning' ? '#f59e0b' : '#4f46e5'}`,
                padding: '24px', borderRadius: '24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '20px',
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
            }}>
                <div style={{ backgroundColor: systemBanner.type === 'maintenance' ? '#ef4444' : systemBanner.type === 'warning' ? '#f59e0b' : '#4f46e5', padding: "12px", borderRadius: "14px" }}>
                    <Zap style={{ width: '28px', height: "28px", color: '#ffffff' }} />
                </div>
                <p style={{ fontSize: '15px', fontWeight: "950", color: systemBanner.type === 'maintenance' ? '#991b1b' : systemBanner.type === 'warning' ? '#92400e' : '#4338ca', margin: 0, lineHeight: "1.4", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    {systemBanner.text}
                </p>
            </div>
        )}

        {isSuccess ? (
          <div style={{ textAlign: "center", padding: "40px 0", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ backgroundColor: "#ecfdf5", padding: "24px", borderRadius: "50%", marginBottom: "24px", width: "fit-content", margin: "0 auto 24px", border: "4px solid #10b981" }}><CheckCircle2 style={{ color: "#10b981", width: "64px", height: "64px" }} /></div>
            <h1 style={{ fontSize: "32px", fontWeight: "900", color: "#111827", marginBottom: "8px" }}>PAYMENT SUCCESS!</h1>
            <p style={{ color: "#4b5563", fontSize: "16px", marginBottom: "32px", fontWeight: "500" }}>Your connection is being activated now.</p>
            <div style={{ backgroundColor: "#f8fafc", padding: "32px", borderRadius: "24px", marginBottom: "40px", border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: "11px", color: "#64748b", fontWeight: "900", textTransform: "uppercase", marginBottom: "8px" }}>WiFi Access Code</p>
              <div style={{ fontSize: "42px", fontWeight: "900", color: "#1e293b", letterSpacing: "2px" }}>{purchasedVoucher}</div>
            </div>
            <div className="spinner" style={{ width: "32px", height: "32px", border: "3px solid #f1f5f9", borderTop: "3px solid #10b981" }}></div>
          </div>
        ) : (
          <div style={{ flex: 1 }}>
            {!mac && !isWaitingForPin && (
                <div style={{ backgroundColor: "#fff7ed", border: "1px solid #ffedd5", padding: "16px", borderRadius: "16px", marginBottom: "24px", textAlign: "center" }}>
                    <ShieldAlert style={{ color: "#f97316", width: "24px", height: "24px", margin: "0 auto 10px" }} />
                    <p style={{ fontSize: "13px", color: "#9a3412", fontWeight: "700" }}>Device unknown. Please turn your Wi-Fi OFF and ON to fix this.</p>
                </div>
            )}

            {tunnelBlocked ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <ShieldAlert style={{ color: "#f59e0b", width: "80px", height: "80px", margin: "0 auto 24px" }} />
                <h2 style={{ fontSize: "24px", fontWeight: "900", color: "#1e293b" }}>CONNECTION LOCKED</h2>
                <button onClick={() => { window.open('/api/admin/offers', '_blank'); setTimeout(() => window.location.reload(), 1500); }} style={{ width: "100%", backgroundColor: "#4f46e5", color: "white", padding: "20px", borderRadius: "20px", fontWeight: "900", border: "none", fontSize: "16px" }}>UNLOCK NOW</button>
              </div>
            ) : isWaitingForPin ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                    <div className="spinner" style={{ width: "56px", height: "56px", border: "6px solid #f1f5f9", borderTop: "4px solid #4f46e5" }}></div>
                    <h2 style={{ marginTop: "40px", fontSize: "28px", fontWeight: "900", color: "#1e293b" }}>CHECK YOUR PHONE</h2>
                    <p style={{ color: "#64748b", fontWeight: "600", marginTop: "8px" }}>Enter your M-Pesa PIN now.</p>
                    <div style={{ backgroundColor: "#f5f3ff", padding: "32px", borderRadius: "32px", margin: "40px 0", border: "2px solid #ddd6fe" }}>
                        <div style={{ fontSize: "64px", fontWeight: "900", color: "#4f46e5", letterSpacing: "-2px" }}>00:{countdown.toString().padStart(2, '0')}</div>
                    </div>
                    <button onClick={handleManualCheck} style={{ width: "100%", backgroundColor: "#1e293b", color: "white", padding: "20px", borderRadius: "20px", fontWeight: "900", cursor: "pointer", border: "none", fontSize: "16px" }}>I HAVE ENTERED PIN</button>
                </div>
            ) : (
              <>
                <p style={{ textAlign: "center", color: "#6b7280", fontSize: "15px", marginBottom: "32px", fontWeight: "500" }}>Choose a plan and connect instantly</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
                  {fetching ? (
                    <div style={{ textAlign: "center", padding: "40px" }}><div className="spinner" style={{ width: "24px", height: "24px" }}></div></div>
                  ) : bundlePlans.map((plan) => (
                    <div key={plan.id} onClick={() => setSelectedPlan(plan)} style={{
                        padding: "20px", borderRadius: "20px", cursor: "pointer", transition: "all 0.2s",
                        border: selectedPlan?.id === plan.id ? "4px solid #4f46e5" : "1px solid #e2e8f0",
                        backgroundColor: selectedPlan?.id === plan.id ? "#f5f3ff" : "#fff",
                        display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                      <div>
                        <div style={{ fontWeight: "900", color: "#1e293b", fontSize: "18px" }}>{plan.name}</div>
                        <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "700" }}>{plan.duration} UNLIMITED ACCESS</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "22px", fontWeight: "900", color: "#4f46e5" }}>{plan.price}</div>
                        <div style={{ fontSize: "10px", fontWeight: "900", color: "#94a3b8" }}>KES</div>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handlePayment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ position: "relative" }}>
                      <Smartphone style={{ position: "absolute", left: "18px", top: "18px", width: "20px", color: "#94a3b8" }} />
                      <input type="tel" required placeholder="07XXXXXXXX" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                         style={{ width: "100%", padding: "18px 18px 18px 50px", borderRadius: "20px", border: "2px solid #e2e8f0", fontSize: "18px", fontWeight: "700", outline: "none" }} />
                  </div>
                  <button type="submit" disabled={loading || !selectedPlan} style={{
                      width: "100%", backgroundColor: loading ? "#94a3b8" : "#111827", color: "#ffffff", padding: "22px", borderRadius: "22px",
                      fontWeight: "950", cursor: "pointer", border: "none", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px"
                  }}>
                    {loading ? "INITIALIZING..." : `PAY KES ${selectedPlan?.price || ''}`}
                    {!loading && <ArrowRight />}
                  </button>
                </form>

                <div style={{ marginTop: "32px", textAlign: "center" }}>
                    {!showRebind ? (
                        <button onClick={() => setShowRebind(true)} style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "14px", fontWeight: "900", cursor: "pointer", textDecoration: "underline" }}>Already paid? Reconnect device</button>
                    ) : (
                        <form onSubmit={handleRebind} style={{ borderTop: "2px dashed #e2e8f0", paddingTop: "24px" }}>
                            <p style={{ fontSize: "12px", color: "#64748b", fontWeight: "800", marginBottom: "16px" }}>ENTER PHONE NUMBER USED TO PAY:</p>
                            <div style={{ display: "flex", gap: "10px" }}>
                                <input type="text" placeholder="07XXXXXXXX" value={rebindValue} onChange={e => setRebindValue(e.target.value)} style={{ flex: 1, padding: "16px", borderRadius: "18px", border: "2px solid #e2e8f0", fontSize: "16px", fontWeight: "700" }} />
                                <button type="submit" style={{ backgroundColor: "#1e293b", color: "white", padding: "0 24px", borderRadius: "18px", border: "none", fontWeight: "900" }}>GO</button>
                            </div>
                            <button type="button" onClick={() => setShowRebind(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "12px", fontWeight: "800", marginTop: "16px" }}>CANCEL</button>
                        </form>
                    )}
                </div>
              </>
            )}
          </div>
        )}

        {status && (
          <div style={{ marginTop: "24px", padding: "20px", borderRadius: "20px", textAlign: "center", fontSize: "14px", fontWeight: "900", backgroundColor: status.success ? "#ecfdf5" : "#fef2f2", color: status.success ? "#059669" : "#dc2626", border: `2px solid ${status.success ? "#10b981" : "#ef4444"}` }}>
            {status.message}
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: "auto", padding: "40px 0 0", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
            <a href="tel:0769345599" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", backgroundColor: "#f8fafc", color: "#1e293b", padding: "20px", borderRadius: "20px", textDecoration: "none", fontWeight: "900", fontSize: "14px", border: "1px solid #e2e8f0" }}>
                📞 CUSTOMER SUPPORT
            </a>
        </div>
      </div>

      <style jsx global>{`
        .spinner { border: 4px solid #f1f5f9; border-top: 4px solid #4f46e5; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
