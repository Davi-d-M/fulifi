'use client';

import { useEffect, useState } from 'react';

interface Analytics {
  metrics: {
    totalRevenue: number;
    totalSessions: number;
    uniqueDevices: number;
    activeUsers: number;
    averageSessionDuration: number;
  };
  period: string;
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [period, setPeriod] = useState('today');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [period]);

  const fetchData = async () => {
    try {
      // Get analytics
      const analyticsRes = await fetch(`/api/analytics?action=${period}`);
      const analyticsData = await analyticsRes.json();
      if (analyticsData.success) {
        setAnalytics(analyticsData);
      }

      // Get alerts
      const alertsRes = await fetch('/api/alerts?filter=unread&limit=10');
      const alertsData = await alertsRes.json();
      if (alertsData.success) {
        setAlerts(alertsData.alerts);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    const response = await fetch(`/api/revenue-export?format=csv&period=${period}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${period}.csv`;
    a.click();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return <div className="p-6 text-center">Loading analytics...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">📊 Analytics Dashboard</h1>
        <div className="space-x-2">
          {['today', 'week', 'month'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded ${
                period === p ? 'bg-blue-600 text-white' : 'bg-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            📥 Download CSV
          </button>
        </div>
      </div>

      {/* Main Metrics */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard
            title="💰 Revenue"
            value={`KES ${analytics.metrics.totalRevenue.toLocaleString()}`}
            color="bg-green-100"
          />
          <MetricCard
            title="👥 Sessions"
            value={analytics.metrics.totalSessions.toString()}
            color="bg-blue-100"
          />
          <MetricCard
            title="📱 Devices"
            value={analytics.metrics.uniqueDevices.toString()}
            color="bg-purple-100"
          />
          <MetricCard
            title="🔴 Active Now"
            value={analytics.metrics.activeUsers.toString()}
            color="bg-red-100"
          />
          <MetricCard
            title="⏱️ Avg Duration"
            value={formatDuration(analytics.metrics.averageSessionDuration)}
            color="bg-yellow-100"
          />
        </div>
      )}

      {/* Alerts Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">🚨 Recent Alerts</h2>
        {alerts.length === 0 ? (
          <p className="text-gray-500">No unread alerts</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map(alert => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="🚫 Blacklist"
          description="Manage blocked devices"
          href="/admin/blacklist"
        />
        <QuickActionCard
          title="✅ Whitelist"
          description="Free access devices"
          href="/admin/whitelist"
        />
        <QuickActionCard
          title="📱 Device Profiles"
          description="User device analytics"
          href="/admin/device-profiles"
        />
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <div className={`${color} p-4 rounded-lg`}>
      <p className="text-sm text-gray-700">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const severityColors = {
    LOW: 'bg-blue-50 border-blue-300',
    MEDIUM: 'bg-yellow-50 border-yellow-300',
    HIGH: 'bg-orange-50 border-orange-300',
    CRITICAL: 'bg-red-50 border-red-300',
  };

  const severityBadges = {
    LOW: 'text-blue-700 bg-blue-200',
    MEDIUM: 'text-yellow-700 bg-yellow-200',
    HIGH: 'text-orange-700 bg-orange-200',
    CRITICAL: 'text-red-700 bg-red-200',
  };

  return (
    <div className={`border-l-4 p-3 rounded ${severityColors[alert.severity as keyof typeof severityColors]}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold">{alert.title}</p>
          <p className="text-sm text-gray-700">{alert.message}</p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded ${severityBadges[alert.severity as keyof typeof severityBadges]}`}
        >
          {alert.severity}
        </span>
      </div>
    </div>
  );
}

function QuickActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg hover:shadow-lg transition transform hover:scale-105"
    >
      <p className="text-xl font-bold">{title}</p>
      <p className="text-sm text-blue-100 mt-1">{description}</p>
    </a>
  );
}
