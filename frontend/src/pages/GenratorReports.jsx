import React, { useState, useEffect, useCallback } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from "recharts";
import { FaSync, FaDownload, FaChartBar } from "react-icons/fa";

const COLORS = ["#2563eb", "#10b981", "#f59e42", "#ef4444", "#6366f1"];

function PeriodRangePicker({ start, end, setStart, setEnd }) {
  return (
    <div className="flex items-center space-x-4">
      <label className="text-sm font-medium text-gray-700">Start</label>
      <input
        type="date"
        className="border rounded px-2 py-1"
        value={start}
        onChange={e => setStart(e.target.value)}
      />
      <label className="text-sm font-medium text-gray-700">End</label>
      <input
        type="date"
        className="border rounded px-2 py-1"
        value={end}
        onChange={e => setEnd(e.target.value)}
      />
    </div>
  );
}

function getCostSummary(generatorArr) {
  if (!generatorArr.length) return {};
  const total_usage = generatorArr.reduce((s, x) => s + (x.total_usage || 0), 0);
  const total_cost = generatorArr.reduce((s, x) => s + (x.total_cost || 0), 0);
  const avg_cost_per_unit = total_usage ? total_cost / total_usage : 0;
  const highest_site = generatorArr.reduce((max, x) =>
    (x.total_cost || 0) > (max.total_cost || 0) ? x : max, generatorArr[0]);
  return {
    total_usage,
    total_cost,
    avg_cost_per_unit,
    highest_site
  };
}

export default function GeneratorsReport({ onDataUpdateRef }) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const [start, setStart] = useState(`${yyyy}-${mm}-01`);
  const [end, setEnd] = useState(`${yyyy}-${mm}-${dd}`);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    const token = localStorage.getItem("access_token");
    // Change URL to fetch combined report without site_id filter
    const resp = await fetch(
      `https://ratilalandsonscrm.onrender.com/api/generators-utilities/reports?start=${start}&end=${end}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    if (!resp.ok) throw new Error("Failed to fetch data");
    const json = await resp.json();
    setReport(json.site_report ? json.site_report : json);
    setTrend(json.trend || []);
    if (onDataUpdateRef && typeof onDataUpdateRef.current === "function") {
      onDataUpdateRef.current();
    }
  } catch (err) {
    setError(err.message);
    setReport(null);
    setTrend([]);
  } finally {
    setLoading(false);
  }
}, [start, end, onDataUpdateRef]);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (onDataUpdateRef) {
      onDataUpdateRef.current = fetchData;
    }
  }, [fetchData, onDataUpdateRef]);

  const handleDownload = () => {
    if (!report || !report.generators) return;
    const rows = [
      ["Generator Name", "Total Usage", "Total Cost"],
      ...report.generators.map(
        d => [d.generator_name, d.total_usage, d.total_cost]
      )
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = `generators_report_${start}_to_${end}.csv`;
    link.click();
  };

  const summary = (report && report.generators) ? getCostSummary(report.generators) : {};

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="flex items-center justify-between mb-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-blue-600 mb-1">
            Generator Usage Report
          </h1>
          <p className="text-gray-600">
            Monitor combined generator usage, fuel consumption and cost analysis for all sites.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-500 text-white px-4 py-2 rounded-lg font-semibold shadow"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-lg p-4 mb-6 shadow border flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 max-w-6xl mx-auto">
        <PeriodRangePicker start={start} end={end} setStart={setStart} setEnd={setEnd} />
        <button
          disabled={!report || !report.generators || !report.generators.length}
          onClick={handleDownload}
          className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-400 text-white px-4 py-2 rounded-lg font-semibold shadow"
        >
          <FaDownload />
          <span>Download CSV</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-60">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-red-300 border rounded-lg p-6 text-red-600 text-center shadow max-w-6xl mx-auto">
          Error loading report: {error}
        </div>
      ) : (
        <div className="space-y-8 max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow border p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FaChartBar className="mr-1 text-indigo-500" />
              Cost Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-gray-500 text-sm">Total Usage</div>
                <div className="text-2xl font-bold">
                  {summary.total_usage ? summary.total_usage.toLocaleString("en-IN") : 0}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Total Cost (₹)</div>
                <div className="text-2xl font-bold">
                  {summary.total_cost ? summary.total_cost.toLocaleString("en-IN") : 0}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Avg Cost per Unit</div>
                <div className="text-2xl font-bold">
                  {summary.avg_cost_per_unit ? summary.avg_cost_per_unit.toFixed(2) : 0}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Highest Cost Generator</div>
                <div className="text-xl font-bold">{summary.highest_site?.generator_name || "-"}</div>
                <div className="text-gray-500">
                  {summary.highest_site ? `₹${summary.highest_site.total_cost.toLocaleString("en-IN")}` : "-"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border p-6 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center">
              <FaChartBar className="mr-1 text-indigo-500" />
              All Generator Usage
            </h3>
            <table className="min-w-full w-full text-base table-fixed">
              <thead>
                <tr className="bg-blue-100 text-gray-700 uppercase text-sm">
                  <th className="p-3 text-center" style={{ width: "25%" }}>Site Name</th>
                  <th className="p-3 text-center" style={{ width: "40%" }}>Generator Name</th>
                  <th className="p-3 text-center" style={{ width: "30%" }}>Fuel Used (L)</th>
                  <th className="p-3 text-center" style={{ width: "30%" }}>Total Fuel Cost (₹)</th>
                </tr>
              </thead>
              <tbody>
                {report && report.generators && report.generators.map((row, idx) => (
                  <tr key={row.generator_id} className={idx % 2 ? "bg-gray-50" : ""}>
                    <td className="p-3 text-center font-semibold">{row.site_name || "-"}</td>
                    <td className="p-3 text-center font-semibold">{row.generator_name}</td>
                    <td className="p-3 text-center">{(row.total_usage || 0).toLocaleString("en-IN")}</td>
                    <td className="p-3 text-center">{(row.total_cost || 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
                {(!report || !report.generators || !report.generators.length) && (
                  <tr><td colSpan={3} className="p-4 text-center text-gray-500">No data for selected period.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center">
              <FaChartBar className="mr-1 text-indigo-500" />
              Usage Trend
            </h3>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" label={{ value: "Usage", angle: -90, position: "insideLeft" }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: "Cost (₹)", angle: 90, position: "insideRight" }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="energy" stroke={COLORS[0]} name="Energy (kWh)" />
                <Line yAxisId="right" type="monotone" dataKey="cost" stroke={COLORS[2]} name="Cost (₹)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
