import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_SECTIONS = [
  { key: "generators", name: "Generators" },
  { key: "usage", name: "Usage Log" },
  { key: "readings", name: "Electricity Readings" },
  { key: "maintenance", name: "Maintenance" },
];

const API_BASE = "https://ratilalandsons.onrender.com/api/generators-utilities";
const USERS_API = "https://ratilalandsons.onrender.com/api/auth/users";
const SITES_API = "https://ratilalandsons.onrender.com/api/sites";
const PAGE_SIZE = 10;

// --- Mapping helpers ---
function mapGenerator(item) {
  return {
    id: item.id,
    generator_id: item.generator_id,
    generator_name: item.generator_name,
    generator_type: item.generator_type,
    capacity: item.capacity,
    installation_date: item.installation_date,
  };
}

function mapUsage(item, usersMap, siteMap) {
  return {
    id: item.id,
    site_id: item.site_id,
    site_name: siteMap[item.site_id] || item.site_id,
    generator_id: item.generator_id,
    date: item.date,
    operator_id: item.operator_id,
    operator_name: usersMap[item.operator_id] || item.operator_id,
    fuel_consumed: item.fuel_consumed,
    fuel_cost_per_litre: item.fuel_cost_per_litre,
    total_fuel_cost: item.total_fuel_cost,
    generator_usage_hours: item.generator_usage_hours,
  };
}

function mapReading(item, siteMap, generatorMap) {
  return {
    id: item.id,
    date: item.date,
    site_id: item.site_id,
    site_name: siteMap[item.site_id] || item.site_id,
    generator_id: item.generator_id,
    generator_name: generatorMap[item.generator_id] || item.generator_id,
    electricity_reading: item.electricity_reading,
    per_unit_cost: item.per_unit_cost,
    total_energy_cost: item.total_energy_cost,
  };
}

function mapMaintenance(item, usersMap, siteMap = {}) {
  return {
    id: item.id,
    generator_id: item.generator_id,
    site_id: item.site_id,
    site_name: (siteMap && siteMap[item.site_id]) || item.site_id,
    date: item.date,
    maintenance_status: item.maintenance_status,
    operating_hours_at_last_service: item.operating_hours_at_last_service,
    technician: (usersMap && usersMap[item.technician])
      ? usersMap[item.technician]
      : item.technician || "-",
  };
}

// Map maintenance to task-like structure for workflow assignment
function mapMaintenanceToTask(item) {
  return {
    id: `maintenance-${item.id}`,
    title: `Maintenance: Generator ${item.generator_id} (${item.maintenance_status})`,
    assignedTo: item.technician,
    due_date: item.date,
    status: item.maintenance_status.toLowerCase(),
    sourceType: "maintenance",
    originalRecord: item,
  };
}

// --- Form/table column setup (unchanged) ---
const generatorFields = [
  { key: "generator_name", label: "Generator Name", type: "text", required: true },
  { key: "generator_type", label: "Type", type: "select", options: ["Diesel", "Gas", "Solar"], required: true },
  { key: "installation_date", label: "Installation Date", type: "date", required: true },
  { key: "capacity", label: "Capacity (kW)", type: "text", required: true },
];

const usageFields = [
  { key: "date", label: "Date", type: "date", required: true },
  { key: "site_id", label: "Site", type: "select", required: true },
  { key: "generator_id", label: "Generator", type: "select", required: true },
  { key: "fuel_consumed", label: "Fuel Consumed (L)", type: "number", required: true },
  { key: "fuel_cost_per_litre", label: "Fuel Cost per Litre", type: "number", required: true },
  { key: "total_fuel_cost", label: "Total Cost", type: "number", required: false, readonly: true },
  { key: "generator_usage_hours", label: "Usage Hours", type: "number", required: true },
  { key: "operator_id", label: "Operator", type: "select", required: true },
];

const readingFields = [
  { key: "date", label: "Date", type: "date", required: true },
  { key: "site_id", label: "Site", type: "select", required: true },
  { key: "generator_id", label: "Generator", type: "select", required: true },
  { key: "electricity_reading", label: "Electricity Reading (kWh)", type: "number", required: true },
  { key: "per_unit_cost", label: "Per Unit Cost", type: "number", required: true },
  { key: "total_energy_cost", label: "Total Cost", type: "number", required: false, readonly: true },
];

const maintenanceFields = [
  { key: "generator_id", label: "Generator", type: "select", required: true },
  { key: "site_id", label: "Site", type: "select", required: true },
  { key: "date", label: "Date", type: "date", required: true },
  { key: "maintenance_status", label: "Status", type: "select", options: ["Scheduled", "Completed", "Pending"], required: true },
  { key: "operating_hours_at_last_service", label: "Operating Hours at Service", type: "number", required: false },
  { key: "technician", label: "Technician", type: "select", required: true },
];

const generatorCols = [
  { label: "Generator ID", key: "generator_id" },
  { label: "Name", key: "generator_name" },
  { label: "Type", key: "generator_type" },
  { label: "Installation Date", key: "installation_date" },
  { label: "Capacity (kW)", key: "capacity" },
];
const usageCols = [
  { label: "Date", key: "date" },
  { label: "Site", key: "site_name" },
  { label: "Generator", key: "generator_id" },
  { label: "Operator", key: "operator_name" },
  { label: "Fuel Consumed (L)", key: "fuel_consumed" },
  { label: "Cost Per Litre", key: "fuel_cost_per_litre" },
  { label: "Total Cost", key: "total_fuel_cost" },
  { label: "Usage Hours", key: "generator_usage_hours" },
];
const readingsCols = [
  { label: "Date", key: "date" },
  { label: "Site", key: "site_name" },
  { label: "Generator", key: "generator_name" },
  { label: "Reading (kWh)", key: "electricity_reading" },
  { label: "Per Unit Cost", key: "per_unit_cost" },
  { label: "Total Cost", key: "total_energy_cost" },
];
const maintenanceCols = [
  { label: "Generator", key: "generator_id" },
  { label: "Site", key: "site_name" },
  { label: "Date", key: "date" },
  { label: "Status", key: "maintenance_status" },
  { label: "Service Hours", key: "operating_hours_at_last_service" },
  { label: "Technician", key: "technician" },
];

function normalizeDate(dateStr) {
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split("-");
    return `${y}-${m}-${d}`;
  }
  return dateStr;
}

function RecordModal({ type, open, fields, options, record, onSave, onClose }) {
  const [form, setForm] = useState(record || {});
  const [error, setError] = useState("");
  useEffect(() => setForm(record || {}), [record, open]);

  useEffect(() => {
    if (type === "usage") {
      const fuel = parseFloat(form.fuel_consumed || 0);
      const cost = parseFloat(form.fuel_cost_per_litre || 0);
      const total = fuel > 0 && cost > 0 ? +(fuel * cost).toFixed(2) : "";
      setForm(f => ({ ...f, total_fuel_cost: total }));
    }
    if (type === "readings") {
      const kwh = parseFloat(form.electricity_reading || 0);
      const punit = parseFloat(form.per_unit_cost || 0);
      const total = kwh > 0 && punit > 0 ? +(kwh * punit).toFixed(2) : "";
      setForm(f => ({ ...f, total_energy_cost: total }));
    }
  }, [form.fuel_consumed, form.fuel_cost_per_litre, form.electricity_reading, form.per_unit_cost]);

  const handleInput = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    let data = { ...form };
    setError("");
    for (let f of fields) {
      if (f.required && (!data[f.key] || data[f.key].toString().trim() === "")) {
        setError("Please fill out all required fields.");
        return;
      }
    }
    onSave(data);
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
          <h3 className="text-xl font-bold mb-4">{record && record.id ? "Edit" : "Add"} {type.charAt(0).toUpperCase() + type.slice(1)}</h3>
          <form className="space-y-3" onSubmit={handleSubmit}>
            {fields.map(field => (
              <div key={field.key}>
                <label className="block mb-1 text-sm font-medium">{field.label} {field.required && <span className="text-red-500">*</span>}</label>
                {field.type === "select" ?
                  <select
                    className="border rounded p-2 w-full"
                    value={form[field.key] || ""}
                    onChange={e => handleInput(field.key, e.target.value)}
                  >
                    <option value="">Select {field.label}</option>
                    {(options[field.key] || field.options || []).map(opt => (
                      typeof opt === "string"
                        ? <option value={opt} key={opt}>{opt}</option>
                        : <option value={opt.value} key={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  : field.readonly ?
                    <input
                      type="number"
                      className="border rounded p-2 w-full bg-gray-100"
                      value={form[field.key] || ""}
                      readOnly
                    />
                    : <input
                      type={field.type}
                      className="border rounded p-2 w-full"
                      value={form[field.key] || ""}
                      onChange={e => handleInput(field.key, field.type === "date" ? normalizeDate(e.target.value) : e.target.value)}
                      required={field.required}
                    />}
              </div>
            ))}
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <motion.button type="submit"
              className="mt-2 w-full bg-gradient-to-r from-blue-600 to-purple-500 text-white font-semibold rounded px-4 py-2"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {record && record.id ? "Save" : "Add"}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Table({ columns, data, rowKey, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border shadow mb-8">
      <table className="w-full text-[0.92rem]">
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="px-2 py-2 font-semibold uppercase text-xs text-blue-800 tracking-wide bg-blue-50 border-b border-blue-100 text-center"
                style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  fontWeight: 600,
                  maxWidth: 150,
                }}
              >
                {col.label}
              </th>
            ))}
            {(onEdit || onDelete) && (
              <th className="px-2 py-2 text-center font-semibold uppercase text-blue-800 bg-blue-50 border-b border-blue-100">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="text-center py-3 text-gray-400" colSpan={columns.length + 1}>
                No records found.
              </td>
            </tr>
          ) : (
            data.map((item, idx) => (
              <motion.tr
                key={item[rowKey]}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.01 }}
                className="hover:bg-blue-50 border-b border-gray-100"
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className="px-2 py-2 text-center align-middle"
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 120,
                      fontSize: "0.95rem",
                    }}
                    title={
                      typeof item[col.key] === "string" && item[col.key].length > 18
                        ? item[col.key]
                        : undefined
                    }
                  >
                    {item[col.key]}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-2 py-2 text-center">
                    {onEdit && (
                      <button
                        className="text-blue-700 hover:underline font-bold px-1"
                        onClick={() => onEdit(item)}
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="text-red-600 hover:underline font-bold px-1"
                        onClick={() => onDelete(item)}
                      >
                        Delete
                      </button>
                    )}
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

function PaginationControl({ page, setPage, total }) {
  const hasPrev = page > 1;
  const hasNext = total > page * PAGE_SIZE;
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-center my-2">
      <button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={!hasPrev}
        className={`px-4 py-2 mr-2 rounded font-semibold transition ${
          hasPrev
            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
            : "bg-gray-200 text-gray-400"
        }`}
      >
        Previous
      </button>
      <span className="mx-2">Page {page}</span>
      <button
        onClick={() => setPage(p => p + 1)}
        disabled={!hasNext}
        className={`px-4 py-2 ml-2 rounded font-semibold transition ${
          hasNext
            ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
            : "bg-gray-200 text-gray-400"
        }`}
      >
        Next
      </button>
    </div>
  );
}

export default function GeneratorsUtilities() {
  const [generators, setGenerators] = useState([]);
  const [usage, setUsage] = useState([]);
  const [readings, setReadings] = useState([]);
  const [maintenanceRaw, setMaintenanceRaw] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [tasks, setTasks] = useState([]); // Added combined tasks state
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [pages, setPages] = useState({ generators: 1, usage: 1, readings: 1, maintenance: 1 });
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("generators");
  const [modalRecord, setModalRecord] = useState(null);
  const [siteMap, setSiteMap] = useState({});
  const [usersMap, setUsersMap] = useState({});

  // Fetch and refresh for lookups and data
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    // Fetch sites and users concurrently
    Promise.all([
      fetch(SITES_API, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(USERS_API, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
    ]).then(([sitesData, usersData]) => {
      setSites(sitesData || []);
      setSiteMap(Object.fromEntries((sitesData || []).map(site => [site.id, site.site_name])));
      setUsers(usersData || []);
      setUsersMap(Object.fromEntries((usersData || []).map(u => [u.id, u.full_name])));
    });
  }, []);

  // Refresh Usage data after siteMap and usersMap load or change
  useEffect(() => {
    if (Object.keys(siteMap).length === 0 || Object.keys(usersMap).length === 0) return;

    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/usage`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setUsage(data.map(item => mapUsage(item, usersMap, siteMap))));
  }, [usersMap, siteMap]);

  const refreshGenerators = () => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/generators`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setGenerators(data.map(mapGenerator)));
  };
  const refreshMaintenance = () => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/maintenance`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setMaintenanceRaw(data || []));
  };
  const refreshReadings = () => {
    const token = localStorage.getItem("access_token");
    Promise.all([
      fetch(SITES_API, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch(`${API_BASE}/generators`, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
    ]).then(([sitesData, generatorsData]) => {
      setSites(sitesData || []);
      const generatorList = generatorsData.map(mapGenerator);
      setGenerators(generatorList);
      const siteMapLocal = Object.fromEntries((sitesData || []).map(site => [site.id, site.site_name]));
      const generatorMap = Object.fromEntries(generatorList.map(gen => [gen.generator_id, gen.generator_name]));
      fetch(`${API_BASE}/readings`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setReadings(data.map(row => mapReading(row, siteMapLocal, generatorMap))));
    });
  };

  // Map maintenance with latest usersMap
  useEffect(() => {
    setMaintenance(maintenanceRaw.map(item => mapMaintenance(item, usersMap, siteMap)));
  }, [maintenanceRaw, usersMap, siteMap]);

  // Combine maintenance as tasks whenever maintenanceRaw or usersMap update
  useEffect(() => {
    if (maintenanceRaw.length > 0 && Object.keys(usersMap).length > 0) {
      const maintenanceTasks = maintenanceRaw.map(item => {
        const technicianId = String(item.technician);
        return {
          id: `maintenance-${item.id}`,
          title: `Maintenance: Generator ${item.generator_id} (${item.maintenance_status})`,
          assignedTo: technicianId,
          due_date: item.date,
          status: item.maintenance_status.toLowerCase(),
          sourceType: "maintenance",
          originalRecord: item,
        };
      });
      setTasks(maintenanceTasks);
    }
  }, [maintenanceRaw, usersMap]);


  useEffect(() => {
    refreshGenerators();
    refreshMaintenance();
    refreshReadings();
  }, []);

  // Options used in selects reused for performance
  const genOptions = useMemo(() => generators.map(g => ({ label: `${g.generator_id} (${g.generator_name})`, value: g.generator_id })), [generators]);
  const siteOptions = useMemo(() => sites.map(site => ({ label: site.site_name, value: site.id })), [sites]);
  const operatorOptions = useMemo(() => users.map(u => ({ label: u.full_name, value: u.id })), [users]);
  const technicianOptions = operatorOptions;

  // Paging helper
  const getPage = (arr, tab) => arr.slice((pages[tab] - 1) * PAGE_SIZE, pages[tab] * PAGE_SIZE);

  // Unified save handler for modals, refreshes relevant data after saving
  const handleSave = (data) => {
    let endpoint, id, payload;
    if (modalType === "generators") {
      endpoint = `${API_BASE}/generators`;
      id = data.generator_id;
      payload = data;
    } else if (modalType === "usage") {
      endpoint = `${API_BASE}/usage`;
      id = data.id;
      payload = data;
    } else if (modalType === "readings") {
      endpoint = `${API_BASE}/readings`;
      id = data.id;
      payload = data;
    } else if (modalType === "maintenance") {
      endpoint = `${API_BASE}/maintenance`;
      id = data.id;
      payload = data;
    }
    const method = id ? "PUT" : "POST";
    const url = id ? `${endpoint}/${id}` : endpoint;

    const token = localStorage.getItem("access_token");

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    }).then(() => {
      setShowModal(false);
      setModalRecord(null);
      if (modalType === "generators") refreshGenerators();
      if (modalType === "usage") {
        Promise.all([
          fetch(SITES_API, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
          fetch(USERS_API, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
        ]).then(([sitesData, usersData]) => {
          setSites(sitesData || []);
          setSiteMap(Object.fromEntries((sitesData || []).map(site => [site.id, site.site_name])));
          setUsers(usersData || []);
          setUsersMap(Object.fromEntries((usersData || []).map(u => [u.id, u.full_name])));
          // Also refresh usage list
          fetch(`${API_BASE}/usage`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => res.json())
            .then(data => setUsage(data.map(item => mapUsage(item, usersData, sitesData))));
        });
      }
      if (modalType === "readings") refreshReadings();
      if (modalType === "maintenance") refreshMaintenance();
    });
  };

  // Unified delete handler with refreshes
  const handleDelete = (type, row) => {
    let endpoint;
    if (type === "generators") endpoint = `${API_BASE}/generators/${row.generator_id}`;
    if (type === "usage") endpoint = `${API_BASE}/usage/${row.id}`;
    if (type === "readings") endpoint = `${API_BASE}/readings/${row.id}`;
    if (type === "maintenance") endpoint = `${API_BASE}/maintenance/${row.id}`;
    const token = localStorage.getItem("access_token");
    fetch(endpoint, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(() => {
        if (type === "generators") refreshGenerators();
        if (type === "usage") {
          Promise.all([
            fetch(SITES_API, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
            fetch(USERS_API, { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
          ]).then(([sitesData, usersData]) => {
            setSites(sitesData || []);
            setSiteMap(Object.fromEntries((sitesData || []).map(site => [site.id, site.site_name])));
            setUsers(usersData || []);
            setUsersMap(Object.fromEntries((usersData || []).map(u => [u.id, u.full_name])));
            // Also refresh usage list
            fetch(`${API_BASE}/usage`, { headers: { Authorization: `Bearer ${token}` } })
              .then(res => res.json())
              .then(data => setUsage(data.map(item => mapUsage(item, usersData, sitesData))));
          });
        }
        if (type === "readings") refreshReadings();
        if (type === "maintenance") refreshMaintenance();
      });
  };

  return (
    <motion.div className="bg-gray-50 min-h-screen px-4 pt-4 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold text-blue-700 mb-3">Generators & Utilities Management</h2>
      <motion.nav className="border-b border-gray-200 bg-white mt-3 overflow-x-auto flex space-x-4">
        {NAV_SECTIONS.map(tab => (
          <motion.button
            key={tab.key}
            onClick={() => setModalType(tab.key)}
            className={`${
              modalType === tab.key
                ? "border-b-2 border-blue-500 text-blue-700"
                : "border-b-2 border-transparent text-gray-700 hover:text-blue-600 hover:border-blue-300"
            } whitespace-nowrap py-2 px-4 font-semibold`}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            {tab.name}
          </motion.button>
        ))}
      </motion.nav>
      <div className="py-4">
        <AnimatePresence mode="wait">
          {modalType === "generators" && (
            <>
              <motion.button
                className="mb-2 bg-blue-600 text-white px-4 py-2 rounded font-semibold"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowModal(true);
                  setModalType("generators");
                  setModalRecord(null);
                }}
              >
                + Add Generator
              </motion.button>
              <Table
                columns={generatorCols}
                data={getPage(generators, "generators")}
                rowKey="generator_id"
                onEdit={(row) => {
                  setModalRecord(row);
                  setShowModal(true);
                  setModalType("generators");
                }}
                onDelete={(row) => handleDelete("generators", row)}
              />
              <PaginationControl
                page={pages.generators}
                setPage={(page) => setPages((p) => ({ ...p, generators: page }))}
                total={generators.length}
              />
            </>
          )}
          {modalType === "usage" && (
            <>
              <motion.button
                className="mb-2 bg-green-600 text-white px-4 py-2 rounded font-semibold"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowModal(true);
                  setModalType("usage");
                  setModalRecord(null);
                }}
              >
                + Add Usage Log
              </motion.button>
              <Table
                columns={usageCols}
                data={getPage(usage, "usage")}
                rowKey="id"
                onEdit={(row) => {
                  setModalRecord(row);
                  setShowModal(true);
                  setModalType("usage");
                }}
                onDelete={(row) => handleDelete("usage", row)}
              />
              <PaginationControl
                page={pages.usage}
                setPage={(page) => setPages((p) => ({ ...p, usage: page }))}
                total={usage.length}
              />
            </>
          )}
          {modalType === "readings" && (
            <>
              <motion.button
                className="mb-2 bg-blue-500 text-white px-4 py-2 rounded font-semibold"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowModal(true);
                  setModalType("readings");
                  setModalRecord(null);
                }}
              >
                + Add Reading
              </motion.button>
              <Table
                columns={readingsCols}
                data={getPage(readings, "readings")}
                rowKey="id"
                onEdit={(row) => {
                  setModalRecord(row);
                  setShowModal(true);
                  setModalType("readings");
                }}
                onDelete={(row) => handleDelete("readings", row)}
              />
              <PaginationControl
                page={pages.readings}
                setPage={(page) => setPages((p) => ({ ...p, readings: page }))}
                total={readings.length}
              />
            </>
          )}
          {modalType === "maintenance" && (
            <>
              <motion.button
                className="mb-2 bg-yellow-500 text-white px-4 py-2 rounded font-semibold"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowModal(true);
                  setModalType("maintenance");
                  setModalRecord(null);
                }}
              >
                + Add Maintenance
              </motion.button>
              <Table
                columns={maintenanceCols}
                data={getPage(maintenance, "maintenance")}
                rowKey="id"
                onEdit={(row) => {
                  setModalRecord(row);
                  setShowModal(true);
                  setModalType("maintenance");
                }}
                onDelete={(row) => handleDelete("maintenance", row)}
              />
              <PaginationControl
                page={pages.maintenance}
                setPage={(page) => setPages((p) => ({ ...p, maintenance: page }))}
                total={maintenance.length}
              />
            </>
          )}
        </AnimatePresence>
      </div>
      {showModal && (
        <RecordModal
          type={modalType}
          open={showModal}
          record={modalRecord}
          fields={
            modalType === "generators"
              ? generatorFields
              : modalType === "usage"
                ? usageFields
                : modalType === "readings"
                  ? readingFields
                  : maintenanceFields
          }
          options={{
            generator_id: genOptions,
            site_id: siteOptions,
            operator_id: operatorOptions,
            technician: technicianOptions,
          }}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </motion.div>
  );
}
