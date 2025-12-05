import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_SECTIONS = [
  { key: "generators", name: "Equipments" },
  { key: "usage", name: "Usage Log" },
  { key: "readings", name: "Electricity Readings" },
  { key: "maintenance", name: "Maintenance Logs" },
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
  { key: "generator_name", label: "Equipment Name", type: "text", required: true },
  { key: "generator_type", label: "Type", type: "select", options: ["Diesel", "Gas", "Solar"], required: true },
  { key: "installation_date", label: "Installation Date", type: "date", required: true },
  { key: "capacity", label: "Capacity (Tons)", type: "text", required: true },
];

const usageFields = [
  { key: "date", label: "Date", type: "date", required: true },
  { key: "site_id", label: "Site Name", type: "select", required: true },
  { key: "generator_id", label: "Equipment", type: "select", required: true },
  { key: "fuel_consumed", label: "Fuel Consumed (L)", type: "number", required: true },
  { key: "fuel_cost_per_litre", label: "Fuel Cost per Litre", type: "number", required: true },
  { key: "total_fuel_cost", label: "Total Cost", type: "number", required: false, readonly: true },
  { key: "generator_usage_hours", label: "Usage Hours", type: "number", required: true },
  { key: "operator_id", label: "Operator Name", type: "select", required: true },
];

const readingFields = [
  { key: "date", label: "Date", type: "date", required: true },
  { key: "site_id", label: "Site Name", type: "select", required: true },
  { key: "generator_id", label: "Equipment", type: "select", required: true },
  { key: "electricity_reading", label: "Electricity Reading (kWh)", type: "number", required: true },
  { key: "per_unit_cost", label: "Per Unit Cost", type: "number", required: true },
  { key: "total_energy_cost", label: "Total Cost", type: "number", required: false, readonly: true },
];

const maintenanceFields = [
  { key: "generator_id", label: "Equipment", type: "select", required: true },
  { key: "site_id", label: "Site", type: "select", required: true },
  { key: "date", label: "Date", type: "date", required: true },
  { key: "maintenance_status", label: "Status", type: "select", options: ["Scheduled", "Completed", "Pending"], required: true },
  { key: "operating_hours_at_last_service", label: "Operating Hours at Service", type: "number", required: false },
  { key: "technician", label: "Technician", type: "select", required: true },
];

const generatorCols = [
  { label: "Equipment ID", key: "generator_id" },
  { label: "Name", key: "generator_name" },
  { label: "Type", key: "generator_type" },
  { label: "Installation Date", key: "installation_date" },
  { label: "Capacity (Tons)", key: "capacity" },
];
const usageCols = [
  { label: "Date", key: "date" },
  { label: "Site", key: "site_name" },
  { label: "Equipment", key: "generator_id" },
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
  { label: "Equipment", key: "generator_id" },
  { label: "Site Name", key: "site_name" },
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
      <motion.div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <motion.button
            className="absolute top-6 right-6 text-gray-500 hover:text-red-500 text-3xl font-bold hover:scale-110 transition-all"
            onClick={onClose}
            whileTap={{ scale: 0.9 }}
          >
            ×
          </motion.button>
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-green-700 mb-2">
              {record && record.id ? "Edit" : "Add"} {type.charAt(0).toUpperCase() + type.slice(1)}
            </h3>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {fields.map(field => (
              <div key={field.key}>
                <label className="block mb-3 text-sm font-semibold text-gray-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {field.type === "select" ?
                  <select
                    className="w-full border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent shadow-inner text-sm"
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
                      className="w-full border border-gray-300 rounded-lg p-4 bg-gray-50 text-green-700 font-semibold text-lg text-right"
                      value={form[field.key] || ""}
                      readOnly
                    />
                    : <input
                      type={field.type}
                      className="w-full border border-gray-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent shadow-inner text-sm"
                      value={form[field.key] || ""}
                      onChange={e => handleInput(field.key, field.type === "date" ? normalizeDate(e.target.value) : e.target.value)}
                      required={field.required}
                    />
                }
              </div>
            ))}
            {error && (
              <motion.div 
                className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {error}
              </motion.div>
            )}
            <motion.button
              type="submit"
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all text-lg"
              whileTap={{ scale: 0.96 }}
            >
              {record && record.id ? "Save Changes" : "Add Record"}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Table({ columns, data, rowKey, onEdit, onDelete, colorTheme = 'green' }) {
  const getColorClasses = (theme) => {
    switch (theme) {
      case 'violet':
        return {
          border: 'border-violet-100',
          headerBg: 'bg-violet-50',
          headerText: 'text-violet-700',
          tableHeaderBg: 'bg-gradient-to-r from-violet-50 to-violet-100',
          tableHeaderText: 'text-violet-700',
          rowHover: 'hover:bg-violet-50'
        };
      case 'green':
        return {
          border: 'border-green-100',
          headerBg: 'bg-green-50',
          headerText: 'text-green-700',
          tableHeaderBg: 'bg-gradient-to-r from-green-50 to-green-100',
          tableHeaderText: 'text-green-700',
          rowHover: 'hover:bg-green-50'
        };
      case 'red':
        return {
          border: 'border-red-100',
          headerBg: 'bg-red-50',
          headerText: 'text-red-700',
          tableHeaderBg: 'bg-gradient-to-r from-red-50 to-red-100',
          tableHeaderText: 'text-red-700',
          rowHover: 'hover:bg-red-50'
        };
      case 'yellow':
        return {
          border: 'border-yellow-100',
          headerBg: 'bg-yellow-50',
          headerText: 'text-yellow-700',
          tableHeaderBg: 'bg-gradient-to-r from-yellow-50 to-yellow-100',
          tableHeaderText: 'text-yellow-700',
          rowHover: 'hover:bg-yellow-50'
        };
      default:
        return {
          border: 'border-gray-100',
          headerBg: 'bg-gray-50',
          headerText: 'text-gray-700',
          tableHeaderBg: 'bg-gradient-to-r from-gray-50 to-gray-100',
          tableHeaderText: 'text-gray-700',
          rowHover: 'hover:bg-gray-50'
        };
    }
  };
  
  const colors = getColorClasses(colorTheme);
  
  return (
    <motion.div
      className={`bg-white shadow-lg rounded-2xl ${colors.border} overflow-hidden mb-6`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
    >
      <div className={`px-6 py-4 border-b border-gray-200 ${colors.headerBg}`}>
        <h3 className={`text-lg font-bold ${colors.headerText}`}>Records</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead className={colors.tableHeaderBg}>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-6 py-4 text-left text-xs font-semibold ${colors.tableHeaderText} uppercase tracking-wider`}
                >
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className={`px-6 py-4 text-center text-xs font-semibold ${colors.tableHeaderText} uppercase tracking-wider`}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td className="py-12 text-center text-gray-400" colSpan={columns.length + 1}>
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
                  className={`${colors.rowHover} transition-colors`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className="px-6 py-4 whitespace-nowrap text-gray-900"
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
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        {onEdit && (
                          <motion.button
                            className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                            onClick={() => onEdit(item)}
                            whileTap={{ scale: 0.9 }}
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </motion.button>
                        )}
                        {onDelete && (
                          <motion.button
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            onClick={() => onDelete(item)}
                            whileTap={{ scale: 0.9 }}
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </motion.button>
                        )}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function PaginationControl({ page, setPage, total, colorTheme = 'green' }) {
  const hasPrev = page > 1;
  const hasNext = total > page * PAGE_SIZE;
  
  const getButtonColors = (theme) => {
    switch (theme) {
      case 'violet':
        return 'bg-gradient-to-r from-violet-500 to-violet-700 text-white hover:from-violet-600 hover:to-violet-800 shadow-lg hover:shadow-xl';
      case 'green':
        return 'bg-gradient-to-r from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800 shadow-lg hover:shadow-xl';
      case 'red':
        return 'bg-gradient-to-r from-red-500 to-red-700 text-white hover:from-red-600 hover:to-red-800 shadow-lg hover:shadow-xl';
      case 'yellow':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-700 text-white hover:from-yellow-600 hover:to-yellow-800 shadow-lg hover:shadow-xl';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-700 text-white hover:from-gray-600 hover:to-gray-800 shadow-lg hover:shadow-xl';
    }
  };
  
  const activeColors = getButtonColors(colorTheme);
  
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-between w-full mt-4 px-6 pb-6">
      <motion.button
        onClick={() => setPage(p => Math.max(1, p - 1))}
        disabled={!hasPrev}
        className={`px-6 py-3 rounded-lg font-semibold transition-all ${
          hasPrev
            ? activeColors
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
        style={{ minWidth: 100 }}
        whileTap={{ scale: 0.96 }}
      >
        Previous
      </motion.button>
      <span className="text-lg font-semibold text-gray-700">Page {page}</span>
      <motion.button
        onClick={() => setPage(p => p + 1)}
        disabled={!hasNext}
        className={`px-6 py-3 rounded-lg font-semibold transition-all ${
          hasNext
            ? activeColors
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
        style={{ minWidth: 100 }}
        whileTap={{ scale: 0.96 }}
      >
        Next
      </motion.button>
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
    <motion.div className="bg-gray-50 min-h-screen p-4 sm:p-8 max-w-8xl mx-auto">
      {/* Top Title */}
      <motion.div
        className="py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
      >
        <div>
          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-left text-violet-700 leading-7 drop-shadow">
            Equipments and Utility Management
          </h1>
          <p className="text-gray-500 mt-1 text-left text-xs sm:text-sm md:text-base">
            Manage generators, usage logs, electricity readings and maintenance records.
          </p>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-lg rounded-2xl border border-gray-100 mb-8 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {NAV_SECTIONS.map(tab => {
            let activeColors, hoverColors;
            if (tab.key === 'generators') {
              activeColors = 'bg-violet-50 border-b-2 border-violet-500 text-violet-700 shadow-md';
              hoverColors = 'hover:text-violet-700 hover:bg-violet-50';
            } else if (tab.key === 'usage') {
              activeColors = 'bg-green-50 border-b-2 border-green-500 text-green-700 shadow-md';
              hoverColors = 'hover:text-green-700 hover:bg-green-50';
            } else if (tab.key === 'readings') {
              activeColors = 'bg-red-50 border-b-2 border-red-500 text-red-700 shadow-md';
              hoverColors = 'hover:text-red-700 hover:bg-red-50';
            } else if (tab.key === 'maintenance') {
              activeColors = 'bg-yellow-50 border-b-2 border-yellow-500 text-yellow-700 shadow-md';
              hoverColors = 'hover:text-yellow-700 hover:bg-yellow-50';
            }
            return (
              <motion.button
                key={tab.key}
                onClick={() => setModalType(tab.key)}
                className={`flex-1 py-4 px-6 font-semibold text-sm focus:outline-none transition-all ${
                  modalType === tab.key
                    ? activeColors
                    : `text-gray-600 ${hoverColors} hover:shadow-sm`
                }`}
                whileTap={{ scale: 0.98 }}
              >
                {tab.name}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="py-4">
        <AnimatePresence mode="wait">
          {modalType === "generators" && (
            <motion.div
              key="generators"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              <motion.button
                className="mb-6 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setShowModal(true);
                  setModalType("generators");
                  setModalRecord(null);
                }}
              >
                + Add EQUIPMENT
              </motion.button>
              <Table
                columns={generatorCols}
                data={getPage(generators, "generators")}
                rowKey="generator_id"
                colorTheme="violet"
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
                colorTheme="violet"
              />
            </motion.div>
          )}
          {modalType === "usage" && (
            <motion.div
              key="usage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              <motion.button
                className="mb-6 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
                whileHover={{ scale: 1.02 }}
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
                colorTheme="green"
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
                colorTheme="green"
              />
            </motion.div>
          )}
          {modalType === "readings" && (
            <motion.div
              key="readings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              <motion.button
                className="mb-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
                whileHover={{ scale: 1.02 }}
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
                colorTheme="red"
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
                colorTheme="red"
              />
            </motion.div>
          )}
          {modalType === "maintenance" && (
            <motion.div
              key="maintenance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            >
              <motion.button
                className="mb-6 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-lg"
                whileHover={{ scale: 1.02 }}
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
                colorTheme="yellow"
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
                colorTheme="yellow"
              />
            </motion.div>
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
