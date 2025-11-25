import React, { useState, useEffect } from "react";
import Select from "react-select";
import { motion, AnimatePresence } from "framer-motion";
import { User2 } from "lucide-react";
import { MdNotificationsNone, MdNotifications, MdEdit, MdDelete } from "react-icons/md";

// ----- Loading Spinner Component -----
function Loader() {
  return (
    <div className="w-full flex justify-center py-16">
      <span className="text-blue-600 font-semibold animate-pulse text-lg">Loading...</span>
    </div>
  );
}

// --- Success Modal ---
function SuccessModal({ show, onClose, message }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full text-center animate-fade-in">
        <div className="flex justify-center mb-4">
          <svg className="h-12 w-12 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Success!</h2>
        <p className="text-gray-700 mb-4">{message}</p>
        <button
          className="px-5 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-semibold mt-2"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// --- Utility: "x days ago" ---
function getTimeline(dateString) {
  if (!dateString) return "--";
  // Parse input as UTC
  const d = new Date(dateString);

  // Get current UTC time
  const now = new Date();
  const nowUTC = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

  const diffMs = nowUTC.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMinutes > 0) return `${diffMinutes} min${diffMinutes > 1 ? "s" : ""} ago`;
  return "Just now";
}

// --- Assign Task Modal ---
function AssignTaskModal({
  open,
  onClose,
  newTask,
  handleTaskChange,
  addTask,
  loading,
  employeeOptions,
  siteOptions,
}) {
  const onSelectChange = (field, selected) => {
    handleTaskChange({ target: { name: field, value: selected ? selected.value : "" } });
  };
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-2xl w-full max-w-xs sm:max-w-lg md:max-w-2xl shadow-2xl relative border-2 border-blue-400 px-4 sm:px-7 py-6 sm:py-10"
          initial={{ scale: 0.92, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 16, transition: { duration: 0.2 } }}
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-3 text-blue-400 hover:text-red-500 text-2xl font-bold"
            aria-label="Close modal"
          >
            ×
          </button>
          <div className="flex flex-col items-center mb-3">
            <div className="bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-full w-14 h-14 flex items-center justify-center text-3xl mb-2 shadow-lg">
              +
            </div>
            <h2 className="text-lg sm:text-2xl font-bold mb-1 text-blue-700 text-center">Assign New Task</h2>
            <p className="text-xs sm:text-sm text-blue-500 mb-2 text-center">
              Fill the form to assign a new task to an employee.
            </p>
          </div>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); addTask(); }} autoComplete="off">
            <div>
              <label className="block text-sm font-medium mb-1">
                Task Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={newTask.title}
                onChange={handleTaskChange}
                placeholder="Enter task title"
                className="border p-2 rounded w-full bg-blue-50 focus:border-blue-400"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Assign To <span className="text-red-500">*</span>
              </label>
              <Select
                inputId="task-assign"
                classNamePrefix="react-select"
                options={employeeOptions}
                onChange={(selected) => onSelectChange("assignedTo", selected)}
                value={employeeOptions.find((opt) => opt.value === newTask.assignedTo) || null}
                placeholder="Search employee"
                isSearchable
                isClearable={false}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: "44px",
                    borderRadius: "0.5rem",
                    borderColor: "#CBD5E1",
                    background: "rgba(255,255,255,0.9)",
                  }),
                  menu: (base) => ({ ...base, zIndex: 10 }),
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site</label>
              <Select
                inputId="task-site"
                classNamePrefix="react-select"
                options={siteOptions}
                onChange={(selected) => onSelectChange("linked_id", selected)}
                value={siteOptions.find((opt) => opt.value === newTask.linked_id) || null}
                placeholder="Select site"
                isSearchable
                isClearable
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: "44px",
                    borderRadius: "0.5rem",
                    borderColor: "#CBD5E1",
                    background: "rgba(255,255,255,0.9)",
                  }),
                  menu: (base) => ({ ...base, zIndex: 10 }),
                }}
              />
            </div>
            {/* REMOVED Manual Date Field */}
            <motion.button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white font-semibold rounded px-4 py-2 mt-2 shadow-sm hover:from-blue-700 hover:to-blue-500"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? "Adding..." : "Assign Task"}
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// --- Assigned Tasks Table ---
function AssignedTasksTable({ tasks, siteOptions, employeeOptions, onEditTask, onDeleteTask }) {
  const [bellFilled, setBellFilled] = useState({});
  const [shaking, setShaking] = useState({});

  const handleBellClick = (id) => {
    setBellFilled((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
    setShaking((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setShaking((prev) => ({ ...prev, [id]: false }));
    }, 400);
  };

  const sortedTasks = [...tasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="w-full max-w-7xl bg-white shadow-lg rounded-2xl p-4 sm:p-8 mx-auto mb-10 border border-blue-100">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl sm:text-2xl font-semibold text-blue-700 leading-tight">Recently Assigned</h2>
      </div>
      {sortedTasks.length === 0 ? (
        <div className="text-gray-500 text-center py-10">No employee assigned yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-100">
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase tracking-wider text-left">Date</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase tracking-wider text-left">Task</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase tracking-wider text-left">Assigned To</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase tracking-wider text-left">Site</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase tracking-wider text-left">Timeline</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase tracking-wider text-center">Reminder</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => {
                const id = task.id || task._id || task.task_id;
                return (
                  <tr key={id} className="border-b last:border-none hover:bg-blue-50 transition">
                    <td className="py-3 px-4 text-gray-600">{task.created_at ? new Date(task.created_at).toLocaleDateString() : "--"}</td>
                    <td className="py-3 px-4 text-gray-800 font-medium">{task.title}</td>
                    <td className="py-3 px-4 text-gray-700">{employeeOptions.find(e => e.value === (task.assignedto || task.assigned_to))?.label || task.assignedto || task.assigned_to || "--"}</td>
                    <td className="py-3 px-4 text-gray-700">{siteOptions.find(s => s.value === task.linked_id)?.label || "--"}</td>
                    <td className="py-3 px-4 text-gray-700">{getTimeline(task.created_at)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center relative">
                        <div className="relative group">
                          <motion.button
                            onClick={() => handleBellClick(id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              outline: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                            aria-label="Toggle reminder"
                            animate={shaking[id] ? { x: [-2, 2, -2, 2, 0] } : { x: 0 }}
                            transition={{ duration: 0.4 }}
                          >
                            {bellFilled[id]
                              ? <MdNotifications size={22} className="text-blue-600" />
                              : <MdNotificationsNone size={22} className="text-blue-500" />}
                          </motion.button>
                          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-8 rounded bg-black text-white text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Notify user</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => onEditTask(task)}
                          className="text-blue-400 hover:text-blue-600"
                          aria-label="Edit task"
                        >
                          <MdEdit size={20} />
                        </button>
                        <button
                          onClick={() => onDeleteTask(id)}
                          className="text-red-400 hover:text-red-600"
                          aria-label="Delete task"
                        >
                          <MdDelete size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Track Status Tab ---
function TrackStatusTab({ reports, employeeOptions }) {
  // Sort reports descending by due_date
  const sortedReports = [...reports].sort((a, b) => new Date(b.due_date) - new Date(a.due_date));
  return (
    <div className="px-2 sm:px-6 py-3 border-b">
      <h2 className="text-2xl sm:text-2xl font-semibold text-blue-700 mb-1">Current Status</h2><br />
      {sortedReports.length === 0 ? (
        <div className="text-gray-500 text-center py-10">No progress data available.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[350px] sm:min-w-[600px] md:min-w-[860px] w-full text-xs sm:text-[0.92rem]">
            <thead className="border-b bg-gradient-to-r from-blue-100 to-violet-100">
              <tr>
                <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-blue-700 uppercase">Date</th>
                <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-blue-700 uppercase">Task</th>
                <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-blue-700 uppercase">Assigned To</th>
                <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-blue-700 uppercase">Status</th>
                <th className="px-2 sm:px-4 py-2 text-left text-xs font-semibold text-blue-700 uppercase">Remarks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedReports.map((rep) => (
                <tr key={rep.id || rep._id} className="odd:odd:bg-gradient-to-r from-violet-50 to-blue-50">
                  <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500">{rep.due_date?.slice(0, 10) || "--"}</td>
                  <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500">{rep.title}</td>
                  <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                    {employeeOptions.find(e => e.value === (rep.assignedto || rep.assigned_to))?.label || rep.assignedto || rep.assigned_to || "--"}
                  </td>
                  <td className="px-2 sm:px-4 py-2 whitespace-nowrap text-xs sm:text-sm text-gray-500 font-semibold">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      rep.status === "completed"
                        ? "bg-green-100 text-green-700 border-green-300"
                        : rep.status === "overdue"
                        ? "bg-red-100 text-red-700 border-red-300"
                        : "bg-gray-100 text-gray-700 border-gray-300"
                    }`}>
                      {rep.status?.charAt(0).toUpperCase() + rep.status?.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{rep.remarks || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TaskWorkflowManagement() {
  const [activeTab, setActiveTab] = useState("assign");
  const [tasks, setTasks] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [newTask, setNewTask] = useState({ title: "", assignedTo: "", linked_id: "" });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dailyReports, setDailyReports] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const userObj = (() => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && parsed.user_id ? parsed : null;
    } catch {
      return null;
    }
  })();

  async function fetchSites() {
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch("http://localhost:3005/api/sites/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
      const data = await res.json();
      const sitesArray = Array.isArray(data) ? data : [];
      setSiteOptions(
        sitesArray.map((site) => ({
          value: site._id || site.id || site.site_id,
          label: site.name || site.site_name || "Unnamed Site",
        }))
      );
    } catch (err) {
      console.error("Failed to fetch sites:", err);
      setSiteOptions([]);
    }
  }

  async function fetchEmployees() {
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(
        "http://127.0.0.1:3005/api/employees/collection/employees?page=1&limit=100",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
      const data = await res.json();
      const array = Array.isArray(data.data) ? data.data : [];
      setEmployeeOptions(
        array.map((emp) => ({
          value: emp.user_id,
          label: `${emp.name || emp.full_name || emp.username || emp.email}`,
        }))
      );
    } catch {
      setEmployeeOptions([]);
    }
  }

  async function fetchDailyReports() {
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch("http://localhost:3005/api/tasks/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
      const data = await res.json();
      setDailyReports(Array.isArray(data) ? data : []);
    } catch {
      setDailyReports([]);
    }
  }

  async function fetchTasks() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch("http://localhost:3005/api/tasks/", {
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch tasks.");
      let data = await res.json();
      if (!Array.isArray(data)) data = [];
      const mapped = data.map((t) => ({
        ...t,
        id: t.id || t._id || t.task_id || undefined,
        createdby: t.created_by || t.createdby || "",
        assignedto: t.assigned_to || t.assignedto || "",
        linked_id: t.linked_id || "",
        created_at: t.created_at || "",
        status: t.status || "pending",
      }));
      setTasks(mapped);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    fetchSites();
    fetchDailyReports();
  }, []);

  // Edit handler opens the modal prefilled with the task info
  const handleEditTask = (task) => {
    setNewTask({
      title: task.title,
      assignedTo: task.assignedto || task.assigned_to,
      linked_id: task.linked_id || "",
      id: task.id // Existing task id to identify update
    });
    setModalOpen(true);
  };

  // Delete handler calls delete API then refreshes tasks
  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3005/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (!res.ok) throw new Error("Failed to delete task");
      await fetchTasks();
    } catch {
      alert("Failed to delete task");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskChange = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  // Add or update task depending on if id exists
  async function addOrUpdateTask() {
    if (!newTask.title || !newTask.assignedTo) return;
    setLoading(true);
    try {
      if (!userObj || !userObj.user_id) {
        alert("User not found. Please log in again.");
        setLoading(false);
        return;
      }
      const token = localStorage.getItem("access_token") || "";
      const now = new Date();
      const taskPayload = {
        title: newTask.title,
        assigned_to: newTask.assignedTo,
        linked_type: newTask.linked_id ? "site" : undefined,
        linked_id: newTask.linked_id || undefined,
      };
      // For new tasks add created_by, created_at, due_date
      if (!newTask.id) {
        taskPayload.created_by = userObj.user_id;
        taskPayload.created_at = now.toISOString();
        taskPayload.due_date = now.toISOString().slice(0, 10);
      }
      const method = newTask.id ? "PUT" : "POST";
      const url = newTask.id
        ? `http://localhost:3005/api/tasks/${newTask.id}`
        : "http://localhost:3005/api/tasks/";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(taskPayload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to save task");
      }
      await fetchTasks();
      setNewTask({ title: "", assignedTo: "", linked_id: "", id: undefined });
      setShowSuccess(true);
      setModalOpen(false);
    } catch (error) {
      alert(error.message || "Failed to save task");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-2 sm:px-6 lg:px-8 font-sans">
      <SuccessModal show={showSuccess} onClose={() => setShowSuccess(false)} message="Task saved successfully!" />
      <div className="max-w-8xl mx-auto">
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">
            <span className="hover:text-blue-600 cursor-pointer">Dashboard</span>
            <span className="mx-2">/</span>
            <span className="text-blue-600">Task Assignment</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">Task & Workflow Management</h2>
            <div className="mt-3 sm:mt-0">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                onClick={() => {
                  setNewTask({ title: "", assignedTo: "", linked_id: "", id: undefined });
                  setModalOpen(true);
                }}
              >
                <User2 size={16} className="mr-2" /> Assign New Task
              </button>
            </div>
          </div>
          <p className="mt-2 text-gray-500">Assign tasks to employees and track their current status.</p>
        </div>
        <div className="border-b border-gray-200 bg-white mb-8">
          <nav className="-mb-px flex space-x-3 overflow-x-auto scrollbar-hide">
            <button
              className={`px-4 py-2 font-medium rounded-t-md whitespace-nowrap ${
                activeTab === "assign"
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("assign")}
            >
              Assigned Tasks
            </button>
            <button
              className={`px-4 py-2 font-medium rounded-t-md whitespace-nowrap ${
                activeTab === "tracker"
                  ? "border-b-2 border-blue-600 text-blue-700"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("tracker")}
            >
              Track Status
            </button>
          </nav>
        </div>
        {activeTab === "assign" && (
          <>
            <AssignTaskModal
              open={modalOpen}
              onClose={() => {
                setModalOpen(false);
                setNewTask({ title: "", assignedTo: "", linked_id: "", id: undefined });
              }}
              newTask={newTask}
              handleTaskChange={handleTaskChange}
              addTask={addOrUpdateTask}
              loading={loading}
              employeeOptions={employeeOptions}
              siteOptions={siteOptions}
            />
            {loading ? (
              <Loader />
            ) : (
              <AssignedTasksTable
                tasks={tasks}
                siteOptions={siteOptions}
                employeeOptions={employeeOptions}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            )}
          </>
        )}
        {activeTab === "tracker" && <TrackStatusTab reports={dailyReports} employeeOptions={employeeOptions} />}
      </div>
    </div>
  );
}

export default TaskWorkflowManagement;