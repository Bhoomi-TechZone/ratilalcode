import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const SITE_API_BASE = "http://localhost:3005/api/sites";
const GENERATOR_API_BASE = "http://localhost:3005/api/generators-utilities/generators";
const EMPLOYEE_API_BASE = "http://localhost:3005/api/auth/users?skip=0&limit=100";
const REPORTS_API_BASE = "http://localhost:3005/api/generators-utilities/reports";
const PAGE_SIZE = 10;
const COLORS = ["#2d6dfc", "#16a34a", "#ea580c", "#db2777", "#9333ea", "#14b8a6"];

// Utility function to check for a valid token and handle API authentication errors
function getTokenOrRedirect() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    alert("Authentication required. Please log in.");
    window.location.href = "/login";
    throw new Error("Missing access token");
  }
  return token;
}

function fetchWithAuth(url, options = {}) {
  const token = getTokenOrRedirect();
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  };
  return fetch(url, { ...options, headers })
    .then(async res => {
      if (!res.ok) {
        let text = await res.text();
        try { text = JSON.parse(text).detail; } catch { }
        if (res.status === 401) {
          alert("Session expired or unauthorized. Please log in again.");
          window.location.href = "/login";
          throw new Error("Unauthorized: " + text);
        }
        throw new Error(text || `API error ${res.status}`);
      }
      if (res.headers.get("content-type")?.includes("application/json")) {
        return res.json();
      } else {
        throw new Error("Expected JSON, got: " + (await res.text()));
      }
    });
}

function SiteModal({ open, record, generators, employees, sites, onSave, onClose }) {
  const [form, setForm] = useState(record || {});
  const [error, setError] = useState("");
  useEffect(() => setForm(record || {}), [record, open]);
  const assignedEmployeeIds = sites
    .filter(site => site.id !== (record?.id || ""))
    .map(site => site.assigned_employee_id)
    .filter(Boolean);
  const fields = [
    { key: "site_name", label: "Site Name", type: "text", required: true },
    { key: "site_location", label: "Location", type: "text", required: true },
    { key: "generator_ids", label: "Generators", type: "multiselect", options: generators },
    { key: "assigned_employee_id", label: "Assigned Employee", type: "select", options: employees },
    { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"], required: true }
  ];
  const handleInput = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const handleMultiSelect = e => {
    const sel = Array.from(e.target.selectedOptions, opt => opt.value);
    handleInput("generator_ids", sel);
  };
  const handleSubmit = e => {
    e.preventDefault();
    for (const f of fields)
      if (f.required && (!form[f.key] || form[f.key].toString().trim() === "")) {
        setError("Please fill out all required fields.");
        return;
      }
    setError("");
    onSave({ ...form });
  };
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="bg-white rounded-xl shadow-md w-full max-w-sm mx-2 p-6 relative"
          initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}>
          <button className="absolute top-2 right-3 text-gray-400 hover:text-red-500 text-2xl"
            onClick={onClose}>×</button>
          <h3 className="text-xl font-bold mb-4">{record && record.id ? "Edit Site" : "Add Site"}</h3>
          <form className="space-y-3" onSubmit={handleSubmit}>
            {fields.map(f => (
              <div key={f.key}>
                <label className="block mb-1 text-sm font-medium">{f.label} {f.required && <span className="text-red-500">*</span>}</label>
                {f.type === "select" ? (
                  <select className="border rounded p-2 w-full" value={form[f.key] || ""}
                    onChange={e => handleInput(f.key, e.target.value)}>
                    <option value="">Select</option>
                    {f.key === "assigned_employee_id"
                      ? f.options.map(opt => {
                        const isAssignedElsewhere = assignedEmployeeIds.includes(opt.id);
                        const isCurrent = opt.id === form.assigned_employee_id;
                        return (
                          <option
                            key={opt.id}
                            value={opt.id}
                            disabled={!isCurrent && isAssignedElsewhere}
                          >
                            {opt.full_name} ({opt.username}){!isCurrent && isAssignedElsewhere ? " — Assigned" : ""}
                          </option>
                        );
                      })
                      : f.options.map(opt =>
                        typeof opt === "string"
                          ? <option key={opt} value={opt}>{opt}</option>
                          : <option key={opt.generator_id} value={opt.generator_id}>{opt.name || opt.generator_name || opt.generator_id}</option>
                      )
                    }
                  </select>
                ) : f.type === "multiselect" ? (
                  <select className="border rounded p-2 w-full"
                    multiple value={form[f.key] || []} onChange={handleMultiSelect}>
                    {f.options.map(opt =>
                      <option key={opt.generator_id} value={opt.generator_id}>{opt.name || opt.generator_name || opt.generator_id}</option>
                    )}
                  </select>
                ) : (
                  <input className="border rounded p-2 w-full"
                    value={form[f.key] || ""}
                    onChange={e => handleInput(f.key, e.target.value)}
                    type={f.type} required={f.required}
                  />
                )}
              </div>
            ))}
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <motion.button type="submit"
              className="mt-2 w-full bg-gradient-to-r from-blue-600 to-purple-500 text-white font-semibold rounded px-4 py-2"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}>
              {record && record.id ? "Save" : "Add"}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Table({ columns, data, rowKey, colorClass, onEdit, onDelete }) {
  return (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-[350px] sm:min-w-[600px] md:min-w-[860px] w-full text-xs sm:text-[0.92rem] bg-white rounded-xl shadow-lg border border-gray-200">
        <thead className={`bg-gradient-to-r ${colorClass}`}>
          <tr>
            {columns.map(({ label }) => (
              <th key={label} className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-white uppercase">
                {label}
              </th>
            ))}
            {!!onEdit && <th className="px-3 py-2 text-left text-xs font-semibold text-white uppercase">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onEdit ? 1 : 0)} className="py-3 text-center text-gray-400">
                No records found.
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <motion.tr
                key={item[rowKey]}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.01, type: "spring", stiffness: 120, damping: 14 }}
                className="hover:bg-gray-50 cursor-default"
              >
                {columns.map(({ key }) => (
                  <td key={key} className="px-2 sm:px-4 py-3 text-gray-700">
                    {item[key]}
                  </td>
                ))}
                {!!onEdit && (
                  <td className="px-2 sm:px-4 py-3">
                    <button className="text-blue-600 underline font-semibold mr-2"
                      onClick={() => onEdit(item)}>
                      Edit
                    </button>
                    <button className="text-red-600 underline font-semibold"
                      onClick={() => onDelete(item)}>
                      Delete
                    </button>
                  </td>
                )}
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function PaginationControl({ page, setPage, hasPrev, hasNext }) {
  if (!hasPrev && !hasNext) return null;
  return (
    <div className="flex items-center justify-between w-full mt-1">
      <motion.button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={!hasPrev}
        className={`px-4 py-2 rounded shadow font-semibold transition ${
          hasPrev ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
        style={{ minWidth: 90, fontSize: "0.95rem" }}
        whileTap={{ scale: 0.96 }}
      >
        Previous
      </motion.button>
      <span className="text-sm sm:text-base text-gray-700 font-medium">{`Page ${page}`}</span>
      <motion.button
        onClick={() => setPage(p => p + 1)}
        disabled={!hasNext}
        className={`px-4 py-2 rounded shadow font-semibold transition ${
          hasNext ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600" : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
        style={{ minWidth: 90, fontSize: "0.95rem" }}
        whileTap={{ scale: 0.96 }}
      >
        Next
      </motion.button>
    </div>
  );
}

function getSummary(stats) {
  if (!stats) return {};
  const generators = stats.generators || [];
  const sumUsage = generators.reduce((x, y) => x + (y.total_usage || 0), 0);
  const sumCost = generators.reduce((x, y) => x + (y.total_cost || 0), 0);
  const maxGen = generators.reduce((a, b) => (a.total_cost || 0) > (b.total_cost || 0) ? a : b, generators[0] || {});
  return {
    count: generators.length,
    usage: sumUsage,
    cost: sumCost,
    max: maxGen
  };
}

export default function SiteManagement() {
  const [sites, setSites] = useState([]);
  const [generators, setGenerators] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeMap, setEmployeeMap] = useState({});
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState("manage");
  const [selectedSite, setSelectedSite] = useState("");
  const [siteReport, setSiteReport] = useState(null);

  useEffect(() => {
    fetchWithAuth(GENERATOR_API_BASE)
      .then(data => setGenerators(data || []))
      .catch(e => console.error("Generator fetch failed:", e.message));
  }, []);

  useEffect(() => {
    fetchWithAuth(EMPLOYEE_API_BASE)
      .then(data => {
        setEmployees(data || []);
        setEmployeeMap(Object.fromEntries((data || []).map(emp => [emp.id, emp.full_name])));
      })
      .catch(e => console.error("Employee fetch failed:", e.message));
  }, []);

  const fetchSites = () => {
    fetchWithAuth(SITE_API_BASE)
      .then(data => setSites(data || []))
      .catch(e => {
        setSites([]); // Always reset state if fetch fails
        console.error("Sites fetch failed:", e.message);
      });
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const genMap = Object.fromEntries(generators.map(gen => [gen.generator_id || gen.generatorId, gen.name || gen.generator_name || gen.generator_id]));
  const sitesWithUtilities = sites.map(site => {
    const utilityIds = site.generator_ids || [];
    const utilities = utilityIds.map(id => genMap[id] || id).join(", ");
    const assignedEmployeeName = employeeMap[site.assigned_employee_id] || "-";
    const status = site.status || "Inactive";
    return { ...site, utilities, assignedEmployeeName, status };
  });

  const columns = [
    { label: "Site Name", key: "site_name" },
    { label: "Generator", key: "utilities" },
    { label: "Location", key: "site_location" },
    { label: "Assigned Employee", key: "assignedEmployeeName" },
    { label: "Status", key: "status" }
  ];

  const hasPrev = page > 1;
  const hasNext = sitesWithUtilities.length > page * PAGE_SIZE;
  const paginated = sitesWithUtilities.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = (siteData) => {
    const method = editing && editing.id ? "PUT" : "POST";
    const url = editing && editing.id ? `${SITE_API_BASE}/${editing.id}` : SITE_API_BASE;
    let payload = { ...siteData };
    if (method === "POST") {
      delete payload.id;
    }
    if (!Array.isArray(payload.generator_ids)) {
      payload.generator_ids = [];
    }
    fetchWithAuth(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(() => {
        setShowModal(false);
        setEditing(null);
        fetchSites();
      })
      .catch(e => alert("Error while saving: " + e.message));
  };

  const handleDelete = (row) => {
    if (!window.confirm("Delete this site?")) return;
    fetchWithAuth(`${SITE_API_BASE}/${row.id}`, {
      method: "DELETE"
    })
      .then(() => fetchSites())
      .catch(e => alert("Error while deleting: " + e.message));
  };

  const fetchSiteReport = async () => {
    if (!selectedSite) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const start = `${yyyy}-${mm}-01`;
    const end = `${yyyy}-${mm}-${dd}`;
    try {
      const data = await fetchWithAuth(`${REPORTS_API_BASE}?start=${start}&end=${end}&site_id=${selectedSite}`);
      let report = data.site_report ? data.site_report : data;
      if (report.assigned_employee_id && employeeMap[report.assigned_employee_id]) {
        report.assigned_employee_name = employeeMap[report.assigned_employee_id];
      } else {
        report.assigned_employee_name = "-";
      }
      if (Array.isArray(report.generators) && report.generators.length > 0) {
        report.generators = report.generators.map(gen => {
          let totalUsage = 0, totalCost = 0;
          if (Array.isArray(gen.usage)) {
            gen.usage.forEach(u => {
              totalUsage += Number(u.fuel_usage || u.fuel_used || 0);
              totalCost += Number(u.total_cost || 0);
            });
          }
          return {
            ...gen,
            generator_name: gen.generator_name || gen.name || "-",
            technician_name: gen.technician && employeeMap[gen.technician] ? employeeMap[gen.technician] : (gen.technician || "-"),
            total_usage: totalUsage,
            total_cost: totalCost
          };
        });
      } else {
        report.generators = [];
      }
      setSiteReport(report);
    } catch (e) {
      setSiteReport(null);
      alert("Failed to fetch site report: " + e.message);
    }
  };

  const summary = getSummary(siteReport);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold text-blue-700">Site Management</h2>
        <div className="space-x-2 flex">
          <button
            className={`px-4 py-2 rounded font-bold ${tab === "manage" ? "bg-blue-600 text-white" : "bg-gray-300"}`}
            onClick={() => setTab("manage")}
          >
            Manage Sites
          </button>
          <button
            className={`px-4 py-2 rounded font-bold ${tab === "reports" ? "bg-blue-600 text-white" : "bg-gray-300"}`}
            onClick={() => setTab("reports")}
          >
            Site Specific Reports
          </button>
        </div>
      </div>
      {tab === "manage" && (
        <>
          <div className="mb-3">
            <button
              className="bg-gradient-to-r from-blue-600 to-purple-500 text-white px-4 py-2 rounded font-semibold shadow-md"
              onClick={() => { setEditing(null); setShowModal(true); }}
            >
              + Add Site
            </button>
          </div>
          <Table
            columns={columns}
            data={paginated}
            rowKey="id"
            colorClass="from-purple-500 to-indigo-400"
            onEdit={row => { setEditing(row); setShowModal(true); }}
            onDelete={handleDelete}
          />
          <PaginationControl page={page} setPage={setPage} hasPrev={hasPrev} hasNext={hasNext} />
          <SiteModal
            open={showModal}
            record={editing}
            generators={generators}
            employees={employees}
            sites={sites}
            onSave={handleSave}
            onClose={() => { setEditing(null); setShowModal(false); }}
          />
        </>
      )}
      {tab === "reports" && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Site Specific Reports</h3>
          <div className="bg-white border rounded-2xl p-6 shadow flex flex-col gap-5">
            <div className="mb-2 flex flex-wrap gap-2 items-center">
              <label htmlFor="siteSelect" className="font-medium">Select Site: </label>
              <select
                id="siteSelect"
                value={selectedSite}
                onChange={e => setSelectedSite(e.target.value)}
                className="border rounded-lg px-3 py-2 font-medium min-w-[180px] text-blue-700 bg-blue-50 border-blue-200"
              >
                <option value="">-- Select Site --</option>
                {sites.map(site => (
                  <option value={site.id} key={site.id}>{site.site_name}</option>
                ))}
              </select>
              <button
                onClick={fetchSiteReport}
                disabled={!selectedSite}
                className="px-4 py-2 bg-gradient-to-l from-blue-600 to-purple-500 text-white rounded-lg font-semibold shadow"
              >
                Show Report
              </button>
            </div>
            {siteReport && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
                  <div className="bg-gradient-to-tr from-blue-200 to-blue-50 rounded-xl p-5 shadow flex flex-col items-center border-blue-200 border">
                    <div className="text-sm text-blue-800 font-medium mb-1">Total Generators</div>
                    <div className="text-3xl font-bold text-blue-700">{summary.count || 0}</div>
                  </div>
                  <div className="bg-gradient-to-tr from-purple-100 to-purple-50 rounded-xl p-5 shadow flex flex-col items-center border-purple-200 border">
                    <div className="text-sm text-purple-900 font-medium mb-1">Total Usage (L)</div>
                    <div className="text-3xl font-bold text-purple-700">{(summary.usage || 0).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="bg-gradient-to-tr from-emerald-100 to-green-50 rounded-xl p-5 shadow flex flex-col items-center border-green-200 border">
                    <div className="text-sm text-green-900 font-medium mb-1">Total Cost (₹)</div>
                    <div className="text-3xl font-bold text-green-700">{(summary.cost || 0).toLocaleString("en-IN")}</div>
                  </div>
                  <div className="bg-gradient-to-tr from-orange-100 to-orange-50 rounded-xl p-5 shadow flex flex-col items-center border-orange-200 border">
                    <div className="text-sm font-medium text-orange-900 mb-1">Most Expensive Generator</div>
                    <div className="text-lg font-bold text-orange-700">{summary.max?.generator_name || "-"}</div>
                    <div className="text-sm text-orange-500">
                      {summary.max?.total_cost ? `₹${summary.max.total_cost.toLocaleString("en-IN")}` : ""}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 border shadow-sm p-4 mb-4 flex flex-wrap gap-8">
                  <div>
                    <div className="text-xs text-gray-500">Site Name</div>
                    <div className="text-lg font-semibold text-blue-900">{siteReport.site_name || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Location</div>
                    <div className="font-medium">{siteReport.site_location || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Status</div>
                    <div className="font-medium">{siteReport.status || "-"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Assigned Employee</div>
                    <div className="font-medium">{siteReport.assigned_employee_name || siteReport.assigned_employee_id || "-"}</div>
                  </div>
                </div>
                <div className="flex flex-col gap-10">
                  <div className="rounded-xl bg-blue-50 border-blue-100 border shadow-md p-5">
                    <h4 className="font-semibold mb-3 text-blue-800">Fuel Used Per Generator</h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={siteReport.generators}>
                        <XAxis dataKey="generator_name" fontSize={13} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total_usage" fill="#2563eb" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border-emerald-100 border shadow-md p-5">
                    <h4 className="font-semibold mb-3 text-green-900">Total Cost Per Generator</h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={siteReport.generators}>
                        <XAxis dataKey="generator_name" fontSize={13} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="total_cost" fill="#10b981" name="Total Cost" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-6">
                  <div className="rounded-xl p-5 bg-purple-50 border-purple-100 border shadow-md">
                    <h4 className="font-semibold mb-3 text-purple-800">Usage Distribution</h4>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={siteReport.generators.map(gen => ({ name: gen.generator_name, value: gen.total_usage }))}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={120}
                          fill="#7c3aed"
                          label
                        >
                          {siteReport.generators.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={40} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="rounded-xl p-5 bg-pink-50 border-pink-100 border shadow-md">
                    <h4 className="font-semibold mb-3 text-pink-600">Cost Distribution</h4>
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={siteReport.generators.map(gen => ({ name: gen.generator_name, value: gen.total_cost }))}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={120}
                          fill="#db2777"
                          label
                        >
                          {siteReport.generators.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={40} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
            {!siteReport && selectedSite && (
              <div className="text-gray-500 py-8 text-md text-center">
                No data yet. Click "Show Report" after selecting a site.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
