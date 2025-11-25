import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { useNavigate } from "react-router-dom";
Chart.register(...registerables);

const API_BASE = "http://localhost:3005/api";

const ATTENDANCE_DUMMY = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  present: [93, 97, 95, 94, 96, 95],
  absent: [7, 3, 5, 6, 4, 5],
};

function calcTrend(current, previous) {
  if (typeof current !== "number" || typeof previous !== "number" || previous === 0)
    return { trend: "—", trendDirection: "positive" };
  const delta = current - previous;
  const trend = (delta >= 0 ? "+" : "") + Math.round((delta / previous) * 100) + "%";
  return { trend, trendDirection: delta >= 0 ? "positive" : "negative" };
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const energyRef = useRef(null);
  const attendanceRef = useRef(null);
  const energyChartRef = useRef(null);
  const attendanceChartRef = useRef(null);

  const [energyMode, setEnergyMode] = useState("period");
  const [dashboardCards, setDashboardCards] = useState([
    {
      key: "total_inventory",
      title: "Total Inventory Items",
      value: "—",
      trend: "—",
      trendDirection: "positive",
      icon: "boxes",
      note: "vs last week"
    },
    {
      key: "attendance",
      title: "Today's Attendance",
      value: "95%",
      trend: "+4%",
      trendDirection: "positive",
      icon: "user-check",
      note: "of registered staff",
      static: true
    },
    {
      key: "absent",
      title: "Absent Today",
      value: 7,
      trend: "-2%",
      trendDirection: "negative",
      icon: "user-times",
      note: "vs yesterday",
      static: true
    },
    {
      key: "energy_used",
      title: "Energy Used (kWh)",
      value: "—",
      trend: "—",
      trendDirection: "positive",
      icon: "bolt",
      note: "Select period"
    }
  ]);
  const [energyData, setEnergyData] = useState({ labels: [], usage: [], cost: [], totalUsage: 0 });
  const [inventoryData, setInventoryData] = useState([]);

  // Fetch inventory/attendance stats & trend (with Authorization header inline)
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/stock/products-trend?period_days=7`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const currentVal = data?.total_present_products || 0;
        const prevVal = data?.previous_total_present_products || 0;
        const { trend, trendDirection } = calcTrend(currentVal, prevVal);
        setDashboardCards(cards =>
          cards.map(card =>
            card.key === "total_inventory"
              ? { ...card, value: currentVal, trend, trendDirection }
              : card
          )
        );
      })
      .catch(e => console.error("Trend fetch failed:", e.message));

    fetch(`${API_BASE}/stock/products`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(products => {
        setInventoryData(products.map(prod => ({
          item: prod.name,
          available: (prod.warehouse_qty || 0) +
            (prod.depot_qty && typeof prod.depot_qty === "object"
              ? Object.values(prod.depot_qty).reduce((a, b) => a + b, 0)
              : 0),
          critical: prod.low_stock_threshold !== undefined &&
            ((prod.warehouse_qty || 0) + (prod.depot_qty && typeof prod.depot_qty === "object"
              ? Object.values(prod.depot_qty).reduce((a, b) => a + b, 0)
              : 0)) <= prod.low_stock_threshold,
          icon: "boxes",
          category: prod.category
        })));
      })
      .catch(e => console.error("Product fetch failed:", e.message));
  }, []);

  // Dynamic energy usage trend/stats (Authorization header inline)
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const windowDays = 7;
    const today = new Date().toISOString().slice(0, 10);

    if (energyMode === "all") {
      fetch(`${API_BASE}/generators-utilities/reports?start=1970-01-01&end=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(res => {
          const trendArr = res?.trend || [];
          const totalAllTime = trendArr.reduce((a, b) => a + (b.energy || 0), 0);
          setDashboardCards(cards =>
            cards.map(card =>
              card.key === "energy_used"
                ? { ...card, value: totalAllTime, note: "All Time (Total kWh)", trend: "+0%", trendDirection: undefined }
                : card
            )
          );
          setEnergyData({
            labels: trendArr.map(t => t.date?.slice(0, 10)),
            usage: trendArr.map(t => t.energy || 0),
            cost: trendArr.map(t => t.cost || 0),
            totalUsage: totalAllTime
          });
        })
        .catch(e => console.error("Energy fetch failed:", e.message));
      return;
    }

    const prevStart = new Date();
    prevStart.setDate(prevStart.getDate() - 2 * windowDays + 1);
    fetch(`${API_BASE}/generators-utilities/reports?start=${encodeURIComponent(prevStart.toISOString().slice(0, 10))}&end=${today}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        const trendArr = res?.trend || [];
        const prevTrend = trendArr.slice(0, windowDays);
        const currTrend = trendArr.slice(windowDays, windowDays * 2);
        const totalPrev = prevTrend.reduce((a, b) => a + (b.energy || 0), 0);
        const totalNow = currTrend.reduce((a, b) => a + (b.energy || 0), 0);
        const { trend, trendDirection } = calcTrend(totalNow, totalPrev);
        setDashboardCards(cards => cards.map(card => {
          if (card.key === "energy_used") {
            return { ...card, value: totalNow, note: `Last ${windowDays} days`, trend, trendDirection }
          }
          return card;
        }));
        setEnergyData({
          labels: currTrend.map(t => t.date?.slice(0,10)),
          usage: currTrend.map(t => t.energy || 0),
          cost: currTrend.map(t => t.cost || 0),
          totalUsage: totalNow
        });
      })
      .catch(e => console.error("Energy fetch failed:", e.message));
  }, [energyMode]);

  // Chart rendering for energy/attendance (unchanged)
  useEffect(() => {
    if (energyRef.current && energyData.labels.length) {
      if (energyChartRef.current) energyChartRef.current.destroy();
      energyChartRef.current = new Chart(energyRef.current, {
        type: "bar",
        data: {
          labels: energyData.labels,
          datasets: [
            {
              label: "Energy Used (kWh)",
              data: energyData.usage,
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              borderColor: "#6366f1",
              borderWidth: 2,
              yAxisID: "y1",
              borderRadius: 12
            },
            {
              label: "Cost (₹)",
              type: "line",
              data: energyData.cost,
              borderColor: "#f59e42",
              backgroundColor: "#fff1d2",
              pointBackgroundColor: "#f59e42",
              borderWidth: 3,
              fill: false,
              yAxisID: "y2",
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { font: { size: 15, family: "Inter, sans-serif" }, color: "#2d3748" } },
            tooltip: { backgroundColor: "#f3f6fd", borderColor: "#6366f1", borderWidth: 1 }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 13 }, color: "#8392a6" } },
            y1: { type: "linear", position: "left", title: { display: true, text: "Energy (kWh)", color: "#667eea" }, beginAtZero: true, grid: { color: "#e0e7ef" }, ticks: { font: { size: 13 }, color: "#6366f1" } },
            y2: { type: "linear", position: "right", title: { display: true, text: "Cost (₹)", color: "#f59e42" }, beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { font: { size: 12 }, color: "#f59e42" } }
          }
        }
      });
    }
    if (attendanceRef.current) {
      if (attendanceChartRef.current) attendanceChartRef.current.destroy();
      attendanceChartRef.current = new Chart(attendanceRef.current, {
        type: "pie",
        data: {
          labels: ["Present", "Absent"],
          datasets: [
            {
              data: [
                ATTENDANCE_DUMMY.present.reduce((a, b) => a + b, 0),
                ATTENDANCE_DUMMY.absent.reduce((a, b) => a + b, 0)
              ],
              backgroundColor: ["#10b981bb", "#ef4444bb"],
              borderWidth: 2,
              borderColor: "#fff"
            }
          ]
        },
        options: {
          plugins: { legend: { position: "bottom", labels: { font: { size: 15 } } } }
        }
      });
    }
    return () => {
      if (energyChartRef.current) energyChartRef.current.destroy();
      if (attendanceChartRef.current) attendanceChartRef.current.destroy();
    };
  }, [energyData]);

  function handleInventoryClick() {
    navigate("/inventory");
  }

  return (
    <div className="min-h-screen bg-gray-30 px-2 sm:px-4 lg:px-6 pb-8">
      {/* Dashboard Header with Period Selector at Top Right */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h3 className="text-lg sm:text-2xl font-bold text-blue-800 tracking-tight">Dashboard Overview</h3>
        <select
          className="ml-2 border rounded px-3 py-1 text-xs bg-gray-100 text-blue-700 font-semibold"
          value={energyMode}
          onChange={e => setEnergyMode(e.target.value)}
          style={{ minWidth: 110 }}
        >
          <option value="period">Last 7 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 xl:grid-cols-4 gap-4 mb-8">
        {dashboardCards.map((stat) => (
          <div key={stat.title}
            className="bg-white rounded-2xl border p-5 flex flex-col justify-between"
            style={{ minHeight: 135 }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">{stat.note}</div>
                <div className="text-base font-semibold text-blue-900">{stat.title}</div>
              </div>
              {stat.icon && (
                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <i className={`fas fa-${stat.icon} text-lg`} />
                </div>
              )}
            </div>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-extrabold text-gray-900">{stat.value}</span>
              {stat.trend && (
                <span className={`text-sm font-bold ${stat.trendDirection === "positive" ? "text-green-600" : "text-red-600"}`}>
                  {stat.trendDirection && <i className={`fas fa-arrow-${stat.trendDirection === "positive" ? "up" : "down"} mr-1`} />}
                  {stat.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Energy Chart Card */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b mb-3">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Energy Usage & Cost</h3>
              <p className="text-xs font-semibold text-gray-600">{energyMode === "all" ? "All Time" : "Last 7 Days"}</p>
            </div>
          </div>
          <div className="h-[230px] sm:h-[300px]">
            <canvas ref={energyRef} />
          </div>
        </div>
        {/* Attendance Pie Card */}
        <div className="bg-white rounded-xl border p-4 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b mb-3">
            <h3 className="font-semibold text-lg text-gray-900">Attendance Analytics</h3>
            <span className="bg-green-50 text-green-700 font-semibold rounded-full px-4 py-1 text-xs">Staff: 100</span>
          </div>
          <div className="h-[180px] sm:h-[260px] flex items-center justify-center">
            <canvas ref={attendanceRef} style={{ maxWidth: 210, maxHeight: 210 }} />
          </div>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg sm:text-xl font-bold text-blue-900">Inventory Overview</h3>
          <button
            className="px-5 py-2 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleInventoryClick}
          >
            View Inventory Details
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-5 p-6 bg-white rounded-xl border">
          {inventoryData.map((item) => (
            <div
              key={item.item}
              className={`flex flex-col items-center justify-center py-6 px-4 rounded-xl border-2 transition cursor-pointer ${
                item.critical ? "border-pink-400 bg-red-50" : "border-blue-200 bg-blue-50"
              } hover:scale-[1.03]`}
            >
              <div className="bg-white rounded-full p-3 mb-2 text-blue-800 shadow">
                <i className={`fas fa-${item.icon} text-2xl`} />
              </div>
              <div className="text-base font-semibold mb-1 text-blue-900">{item.item}</div>
              <div className="text-2xl font-bold text-indigo-700 mb-1">{item.available}</div>
              {item.critical && (
                <div className="text-xs font-semibold text-pink-700 bg-pink-100 rounded-xl px-3 py-1 mt-2">
                  Low Stock!
                </div>
              )}
              {item.category && <div className="text-xs text-gray-500 mt-1">{item.category}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
