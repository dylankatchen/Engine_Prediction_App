import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Database, Gauge, RefreshCw, ChevronRight, ArrowUpDown, Zap } from 'lucide-react';
import './App.css';

interface EngineStatus {
  engineId: number;
  lastPredictedRul: number;
  lastUpdate: string;
}

interface RulHistory {
  cycle: number;
  predictedRul: number;
  timestamp: string;
  data: Record<string, number>;
}

type SortKey = 'id' | 'rul' | 'update';
type SortDir = 'asc' | 'desc';

const CRITICAL_THRESHOLD = 50;
const WARNING_THRESHOLD = 100;

// NASA CMAPSS Sensor Mapping (Indices 5-25)
const SENSOR_METADATA: Record<string, { label: string, unit: string }> = {
  "5": { label: "T2", unit: "°R" },
  "6": { label: "T24", unit: "°R" },
  "7": { label: "T30", unit: "°R" },
  "8": { label: "T50", unit: "°R" },
  "9": { label: "P2", unit: "psia" },
  "10": { label: "P15", unit: "psia" },
  "11": { label: "P30", unit: "psia" },
  "12": { label: "Nf", unit: "rpm" },
  "13": { label: "Nc", unit: "rpm" },
  "14": { label: "epr", unit: "ratio" },
  "15": { label: "Ps30", unit: "psia" },
  "16": { label: "phi", unit: "ratio" },
  "17": { label: "NRf", unit: "rpm" },
  "18": { label: "NRc", unit: "rpm" },
  "19": { label: "BPR", unit: "ratio" },
  "20": { label: "far", unit: "ratio" },
  "21": { label: "ht", unit: "units" },
  "22": { label: "Nf_d", unit: "rpm" },
  "23": { label: "PCN", unit: "%" },
  "24": { label: "W31", unit: "lb/s" },
  "25": { label: "W32", unit: "lb/s" },
};

// Filtered list of sensors that show meaningful degradation in FD001
const ACTIVE_SENSORS = ["6", "7", "8", "11", "12", "13", "15", "16", "17", "18", "19", "21", "24", "25"];

function App() {
  const [statuses, setStatuses] = useState<EngineStatus[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<number | null>(null);
  const [history, setHistory] = useState<RulHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [sortKey, setSortKey] = useState<SortKey>('update');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8080/api/engines/status');
      const data = await response.json();
      setStatuses(data);

      setSelectedEngine(current => {
        if (current === null && data.length > 0) {
          return data[0].engineId;
        }
        return current;
      });

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8080/api/engines/${id}/history`);
      const data = await response.json();
      const sortedHistory = data
        .sort((a: any, b: any) => a.cycle - b.cycle)
        .map((h: any) => ({
          cycle: h.cycle,
          predictedRul: h.predictedRul,
          timestamp: h.timestamp,
          data: h.data
        }));
      setHistory(sortedHistory);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (selectedEngine !== null) {
      fetchHistory(selectedEngine);
    }
  }, [selectedEngine, lastUpdated, fetchHistory]);

  const criticalEngines = statuses.filter(s => s.lastPredictedRul < CRITICAL_THRESHOLD);
  const warningEngines = statuses.filter(s => s.lastPredictedRul >= CRITICAL_THRESHOLD && s.lastPredictedRul < WARNING_THRESHOLD);

  const getRulColor = (rul: number) => {
    if (rul < CRITICAL_THRESHOLD) return 'var(--danger)';
    if (rul < WARNING_THRESHOLD) return 'var(--warning)';
    return 'var(--success)';
  };

  const fleetChartData = [...statuses]
    .sort((a, b) => a.lastPredictedRul - b.lastPredictedRul)
    .slice(0, 10)
    .map(s => ({
      id: s.engineId,
      label: `Eng ${s.engineId}`,
      rul: Math.round(s.lastPredictedRul)
    }));

  const sortedStatuses = useMemo(() => {
    return [...statuses].sort((a, b) => {
      let result = 0;
      if (sortKey === 'id') result = a.engineId - b.engineId;
      else if (sortKey === 'rul') result = a.lastPredictedRul - b.lastPredictedRul;
      else if (sortKey === 'update') result = new Date(a.lastUpdate).getTime() - new Date(b.lastUpdate).getTime();

      return sortDir === 'asc' ? result : -result;
    });
  }, [statuses, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const latestReading = history[history.length - 1];
  const baselineReading = history[0];

  return (
    <div className="dashboard">
      <header className="header animate-fade-in">
        <div className="brand">
          <Activity className="icon-pulse" color="var(--primary)" size={32} />
          <h1 className="gradient-text">Engine Data Dashboard</h1>
        </div>
        <div className="status-badge glass">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Last sync: {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </header>

      <main className="content">
        <div className="stats-grid">
          <StatCard
            title="Total Engines"
            value={statuses.length}
            icon={<Database color="var(--primary)" />}
            className="animate-fade-in"
          />
          <StatCard
            title="Critical Health"
            value={criticalEngines.length}
            icon={<AlertTriangle color="var(--danger)" />}
            color="var(--danger)"
            className="animate-fade-in"
          />
          <StatCard
            title="Avg RUL"
            value={statuses.length ? Math.round(statuses.reduce((acc, s) => acc + s.lastPredictedRul, 0) / statuses.length) : 0}
            icon={<Gauge color="var(--secondary)" />}
            className="animate-fade-in"
          />
          <StatCard
            title="Systems Normal"
            value={statuses.length - criticalEngines.length - warningEngines.length}
            icon={<CheckCircle color="var(--success)" />}
            className="animate-fade-in"
          />
        </div>

        <div className="main-grid">
          <div className="left-panel">
            <section className="chart-section glass animate-fade-in">
              <h3>Priority Attention (Lowest RUL)</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={fleetChartData}
                    onClick={(data: any) => {
                      if (data && data.activePayload) {
                        setSelectedEngine(data.activePayload[0].payload.id);
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-dim)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--primary)' }}
                    />
                    <Bar dataKey="rul" radius={[4, 4, 0, 0]} style={{ cursor: 'pointer' }}>
                      {fleetChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getRulColor(entry.rul)}
                          fillOpacity={selectedEngine === entry.id ? 1 : 0.6}
                          stroke={selectedEngine === entry.id ? 'white' : 'none'}
                          strokeWidth={2}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="vitals-section glass animate-fade-in" style={{ marginTop: '1.5rem' }}>
              <div className="section-header">
                <h3>Engine #{selectedEngine} Sensor Matrix</h3>
                <div className="health-legend">
                  <span className="dot success"></span> <span>Normal</span>
                  <span className="dot danger"></span> <span>Degrading</span>
                </div>
              </div>
              <div className="vitals-grid">
                {ACTIVE_SENSORS.map(sensorId => {
                  const meta = SENSOR_METADATA[sensorId];
                  const currentVal = latestReading?.data[sensorId] || 0;
                  const baseVal = baselineReading?.data[sensorId] || currentVal;
                  const diff = baseVal !== 0 ? ((currentVal - baseVal) / baseVal) * 100 : 0;
                  const isDegrading = Math.abs(diff) > 2.0;

                  // Sparkline data
                  const sparkData = history.slice(-20).map(h => ({ val: h.data[sensorId] }));

                  return (
                    <div key={sensorId} className={`vital-card glass ${isDegrading ? 'degrading' : ''}`}>
                      <div className="vital-header">
                        <span className="vital-label">{meta.label}</span>
                        <span className={`vital-diff ${diff > 0 ? 'pos' : 'neg'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                        </span>
                      </div>
                      <div className="vital-value">
                        {currentVal.toFixed(2)} <span className="unit">{meta.unit}</span>
                      </div>
                      <div className="vital-spark">
                        <ResponsiveContainer width="100%" height={30}>
                          <AreaChart data={sparkData}>
                            <Area
                              type="monotone"
                              dataKey="val"
                              stroke={isDegrading ? 'var(--danger)' : 'var(--primary)'}
                              fill={isDegrading ? 'var(--danger-glow)' : 'var(--primary-glow)'}
                              strokeWidth={1}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="history-section glass animate-fade-in" style={{ marginTop: '1.5rem' }}>
              <div className="section-header">
                <h3>RUL Strategic Trend</h3>
                <span className="badge-info">Cycles: {history.length}</span>
              </div>
              <div className="chart-container">
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="cycle" stroke="var(--text-dim)" fontSize={12} tickLine={false} />
                      <YAxis stroke="var(--text-dim)" fontSize={12} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="predictedRul"
                        stroke="var(--secondary)"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data">Collecting historical data points...</div>
                )}
              </div>
            </section>
          </div>

          <section className="engine-list-section glass animate-fade-in">
            <div className="section-header">
              <h3>Fleet Activity</h3>
              {criticalEngines.length > 0 && <span className="badge-danger">Alert</span>}
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('id')} className="sortable-header">
                      ID <ArrowUpDown size={12} className={sortKey === 'id' ? 'active-sort' : 'dim'} />
                    </th>
                    <th onClick={() => toggleSort('rul')} className="sortable-header">
                      RUL <ArrowUpDown size={12} className={sortKey === 'rul' ? 'active-sort' : 'dim'} />
                    </th>
                    <th onClick={() => toggleSort('update')} className="sortable-header">
                      Updated <ArrowUpDown size={12} className={sortKey === 'update' ? 'active-sort' : 'dim'} />
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStatuses.map(s => (
                    <tr
                      key={s.engineId}
                      className={selectedEngine === s.engineId ? 'selected-row' : ''}
                      onClick={() => setSelectedEngine(s.engineId)}
                    >
                      <td>#{s.engineId}</td>
                      <td>
                        <span
                          className="status-text"
                          style={{ color: getRulColor(s.lastPredictedRul) }}
                        >
                          {Math.round(s.lastPredictedRul)}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        {new Date(s.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="action-cell">
                        <ChevronRight size={16} color={selectedEngine === s.engineId ? 'var(--primary)' : 'var(--text-dim)'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color = 'var(--text)', className = '' }: any) {
  return (
    <div className={`stat-card glass ${className}`}>
      <div className="stat-content">
        <span className="stat-title">{title}</span>
        <span className="stat-value" style={{ color }}>{value}</span>
      </div>
      <div className="stat-icon">{icon}</div>
    </div>
  );
}

export default App;
