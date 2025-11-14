import React, { useState, useEffect } from "react";
import Select from "react-select";

// Success Modal Component (unchanged)
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

// Utility for mapping maintenance logs to task
function mapMaintenanceToTask(m) {
  return {
    id: `maintenance-${m.id || m._id}`,
    title: `Maintenance: Generator ${m.generator_id}`,
    createdby: "", // or m.created_by if your UI wants this
    assignedto: m.technician,
    site_name: m.site_name || m.site_id || "--",
    status: m.maintenance_status || "pending"
  };
}

// Task Table and Stats (unchanged)
function TaskTableAndStats({ tasks, type, updateTaskStatus, loading, currentUser }) {
  const [filter, setFilter] = useState("all");
  const [selectedTasks, setSelectedTasks] = useState([]);

  const filteredTasks = tasks.filter(task => {
    if (filter === "all") return true;
    if (filter === "completed") return task.status === "completed";
    return true;
  });

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-300";
      case "approved":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const toggleTaskSelection = (id) => {
    setSelectedTasks((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const selectAll = () => {
    setSelectedTasks(selectedTasks.length === filteredTasks.length ? [] : filteredTasks.map((t) => t.id));
  };

  const bulkComplete = async () => {
    for (const id of selectedTasks) {
      await updateTaskStatus(id, "completed", currentUser, "Bulk completed");
    }
    setSelectedTasks([]);
  };

  const markComplete = async (id) => {
    await updateTaskStatus(id, "completed", currentUser, "Marked complete");
  };

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded text-sm font-medium transition ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>All ({tasks.length})</button>
        <button onClick={() => setFilter("completed")} className={`px-3 py-1 rounded text-sm font-medium transition ${filter === "completed" ? "bg-green-600 text-white" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>Completed ({tasks.filter(t => t.status === "completed").length})</button>
      </div>
      {selectedTasks.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">{selectedTasks.length} task{selectedTasks.length > 1 ? "s" : ""} selected</span>
          <div className="flex gap-2">
            <button onClick={bulkComplete} disabled={loading} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-medium transition">Mark Complete</button>
            <button onClick={() => setSelectedTasks([])} className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded font-medium transition">Cancel</button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="py-3 px-3 text-left"><input type="checkbox" checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0} onChange={selectAll} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></th>
              <th className="py-3 px-3 text-left text-sm font-semibold text-gray-700">Task</th>
              <th className="py-3 px-3 text-left text-sm font-semibold text-gray-700">{type === "my" ? "Assigned By" : "Assigned To"}</th>
              <th className="py-3 px-3 text-left text-sm font-semibold text-gray-700">Site</th>
              <th className="py-3 px-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="py-3 px-3 text-left text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">No tasks found.</td>
              </tr>
            ) : (
              filteredTasks.map((task) => (
                <tr key={task.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-3"><input type="checkbox" checked={selectedTasks.includes(task.id)} onChange={() => toggleTaskSelection(task.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></td>
                  <td className="py-3 px-3"><div className="font-medium text-gray-900">{task.title}</div></td>
                  <td className="py-3 px-3 text-sm text-gray-700">{type === "my" ? task.createdby : task.assignedto}</td>
                  <td className="py-3 px-3 text-sm text-gray-700">{task.site_name || "--"}</td>
                  <td className="py-3 px-3"><span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(task.status)}`}>{task.status?.charAt(0).toUpperCase() + task.status?.slice(1)}</span></td>
                  <td className="py-3 px-3">{task.status !== "completed" && (
                    <button onClick={() => markComplete(task.id)} disabled={loading} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition" title="Mark Complete">✓ Complete</button>
                  )}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200"><div className="text-sm text-blue-700 font-medium">Total Tasks</div><div className="text-2xl font-bold text-blue-900">{tasks.length}</div></div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-200"><div className="text-sm text-green-700 font-medium">Completed</div><div className="text-2xl font-bold text-green-900">{tasks.filter((t) => t.status === "completed").length}</div></div>
      </div>
    </div>
  );
}

export default function TaskWorkflowManagement() {
  const [activeTab, setActiveTab] = useState("assign");
  const [tasks, setTasks] = useState([]);
  const [maintenanceRaw, setMaintenanceRaw] = useState([]);
  const [users, setUsers] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [newTask, setNewTask] = useState({ title: "", assignedTo: "", due: "" });
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dailyReports, setDailyReports] = useState([]);

  // Get user from localStorage
  const userObj = (() => {
    const raw = localStorage.getItem("user");
    if (!raw) return { user_id: "USR-102" };
    try {
      return JSON.parse(raw);
    } catch {
      return { user_id: "USR-102" };
    }
  })();

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
    fetchDailyReports();
    fetchMaintenance();
    fetchUsers();
  }, []);

  async function fetchEmployees() {
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch("http://localhost:3005/api/auth/users", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
      const data = await res.json();
      setEmployeeOptions(Array.isArray(data) ? data.map((user) => ({
        value: user.id,
        label: `${user.full_name} (${user.username})`
      })) : []);
    } catch {
      setEmployeeOptions([]);
    }
  }

  async function fetchUsers() {
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch("http://localhost:3005/api/auth/users", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
      const data = await res.json();
      setUsers(data);
    } catch {
      setUsers([]);
    }
  }

  async function fetchMaintenance() {
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch("http://localhost:3005/api/generators-utilities/maintenance", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);
      const data = await res.json();
      setMaintenanceRaw(Array.isArray(data) ? data : []);
      console.log("Fetched maintenanceRaw:", data);
    } catch {
      setMaintenanceRaw([]);
    }
  }

  async function fetchDailyReports() {
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch("http://localhost:3005/api/tasks/", {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
        id: t.id || t._id || undefined,
        createdby: t.created_by || t.createdby || "",
        assignedto: t.assigned_to || t.assignedto || "",
        site_name: t.site_name || t.site || "--",
        status: t.status || "pending",
      }));
      console.log("Fetched tasks mapped:", mapped);
      setTasks(mapped);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  const handleTaskChange = (e) => {
    const { name, value } = e.target;
    setNewTask((prev) => ({ ...prev, [name]: value }));
  };

  async function addTask() {
    if (!newTask.title || !newTask.assignedTo || !newTask.due) return;
    setLoading(true);
    try {
      const taskPayload = { title: newTask.title, assigned_to: newTask.assignedTo, due_date: newTask.due, created_by: userObj.user_id };
      const res = await fetch("http://localhost:3005/api/tasks/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
        body: JSON.stringify(taskPayload),
      });
      if (!res.ok) throw new Error("Failed to add task");
      await fetchTasks();
      setNewTask({ title: "", assignedTo: "", due: "" });
      setShowSuccess(true);
      setActiveTab("assign");
    } catch {
      alert("Failed to add task");
    }
    setLoading(false);
  }

  async function updateTaskStatus(taskId, status, userId, comment) {
    try {
      const updatePayload = { status, user: userId, comment };
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(`http://localhost:3005/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatePayload),
      });
      if (!res.ok) throw new Error("Failed to update task");
      await fetchTasks();
    } catch (err) {
      alert(err.message || "Error updating task");
    }
  }

  // --- WAIT for USERS to finish loading before doing ID mapping ---
  if (users.length === 0) {
    return <div>Loading users...</div>;
  }

  // Robust normalization
  const normalize = v => (v ? v.toLowerCase().trim() : "");
  const userIdNorm = normalize(userObj.user_id);
  const usernameNorm = normalize(userObj.username);

  // Get mongoId for logged-in user
  const loggedInMongoId = users.find(
    u => normalize(u.user_id) === userIdNorm || normalize(u.username) === usernameNorm
  )?.id;

  // Filter maintenance logs for that user
  const myMaintenanceLogs = loggedInMongoId
    ? maintenanceRaw.filter((m) => String(m.technician) === String(loggedInMongoId)).map(mapMaintenanceToTask)
    : [];

  // My Tasks: INCLUDE maintenance and tasks, both by loggedInMongoId!
  const myTasks = [
    ...tasks.filter(t => String(t.assignedto) === String(loggedInMongoId)).map(t => ({
      ...t,
      site_name: t.site_name || t.site || "--"
    })),
    ...myMaintenanceLogs
  ];

  console.log("loggedInMongoId:", loggedInMongoId);
  console.log("maintenanceRaw:", maintenanceRaw);
  console.log("myMaintenanceLogs:", myMaintenanceLogs);
  console.log("myTasks:", myTasks);
  const teamTasks = tasks.filter((t) => t.createdby === userObj.user_id);

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-2 sm:px-6 lg:px-8 font-sans">
      <SuccessModal show={showSuccess} onClose={() => setShowSuccess(false)} message="Task added successfully!" />
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">Task & Workflow Management</h2>
          <p className="text-gray-500 text-base">Assign tasks, track progress, manage approvals, and stay notified.</p>
        </div>
        <div className="border-b border-gray-200 bg-white mb-8">
          <nav className="-mb-px flex flex-wrap sm:flex-row sm:space-x-3 overflow-x-auto scrollbar-hide">
            {["assign", "tracker", "teamTasks", "myTasks"].map((tabKey) => {
              const tabNames = {
                assign: "Assign Task",
                tracker: "Progress Tracker",
                teamTasks: "Team Tasks",
                myTasks: "My Tasks"
              };
              return (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-4 py-2 font-medium rounded-t-md whitespace-nowrap ${
                    activeTab === tabKey ? "border-b-2 border-blue-600 text-blue-700" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {tabNames[tabKey]}
                </button>
              );
            })}
          </nav>
        </div>
        {activeTab === "assign" && (
          <AssignTaskTab
            newTask={newTask}
            handleTaskChange={handleTaskChange}
            addTask={addTask}
            loading={loading}
            employeeOptions={employeeOptions}
          />
        )}
        {activeTab === "tracker" && <ProgressTrackerTab reports={dailyReports} employees={employeeOptions} />}
        {activeTab === "myTasks" && (
          <TaskTableAndStats
            tasks={myTasks}
            type="my"
            updateTaskStatus={updateTaskStatus}
            loading={loading}
            currentUser={loggedInMongoId}
          />
        )}
        {activeTab === "teamTasks" && (
          <TaskTableAndStats
            tasks={teamTasks}
            type="team"
            updateTaskStatus={updateTaskStatus}
            loading={loading}
            currentUser={loggedInMongoId}
          />
        )}
      </div>
    </div>
  );
}

// Progress Tracker Tab (unchanged)
function ProgressTrackerTab({ reports, employees }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold text-blue-800 mb-6">Progress Tracker</h3>
      {reports.length === 0 ? (
        <div className="py-10 text-gray-500 text-center">No progress reports available.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="py-3 px-3 text-left text-sm font-semibold text-gray-700">Date</th>
                <th className="py-3 px-3 text-left text-sm font-semibold text-gray-700">Task</th>
                <th className="py-3 px-3 text-left text-sm font-semibold text-gray-700">Assigned To</th>
                <th className="py-3 px-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="py-3 px-3 text-left text-sm font-semibold text-gray-700">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((rep) => (
                <tr key={rep.id || rep._id}>
                  <td className="py-3 px-3 text-gray-900">{rep.due_date?.slice(0, 10) || "--"}</td>
                  <td className="py-3 px-3 text-gray-700">{rep.title}</td>
                  <td className="py-3 px-3 text-gray-700">{rep.assignedto || rep.assigned_to}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold border ${
                        rep.status === "completed"
                          ? "bg-green-100 text-green-700 border-green-300"
                          : rep.status === "overdue"
                          ? "bg-red-100 text-red-700 border-red-300"
                          : "bg-gray-100 text-gray-700 border-gray-300"
                      }`}
                    >
                      {rep.status?.charAt(0).toUpperCase() + rep.status?.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-500">{rep.remarks || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Assign Task Tab (unchanged)
function AssignTaskTab({ newTask, handleTaskChange, addTask, loading, employeeOptions }) {
  const onSelectChange = (field, selected) => {
    handleTaskChange({ target: { name: field, value: selected ? selected.value : "" } });
  };
  return (
    <div className="bg-white80 backdrop-blur-md rounded-2xl shadow-xl p-6 sm:p-8 mb-8 border border-blue-100 transition">
      <h3 className="text-xl font-bold text-blue-800 flex items-center gap-3 mb-6">
        <span className="inline-flex items-center justify-center bg-blue-50 rounded-full p-2 shadow"></span>
        Assign Task
      </h3>
      <form
        className="grid gap-4 sm:grid-cols-2 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          addTask();
        }}
        autoComplete="off"
      >
        <div className="mb-4">
          <label className="block text-sm font-medium text-blue-900 mb-1" htmlFor="task-title">
            Task Title<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="task-title"
            name="title"
            value={newTask.title}
            onChange={handleTaskChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
            placeholder="Enter task title"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1" htmlFor="task-assign">
            Assign To<span className="text-red-500">*</span>
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
                boxShadow: "none",
                background: "rgba(255, 255, 255, 0.9)"
              }),
              menu: (base) => ({
                ...base,
                zIndex: 10
              })
            }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1" htmlFor="task-due">
            Date<span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="task-due"
            name="due"
            value={newTask.due}
            onChange={handleTaskChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
            required
          />
        </div>
        <div className="col-span-full flex justify-end mt-2">
          <button
            type="submit"
            disabled={loading}
            className="text-white bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2"
          >
            {loading ? "Adding..." : "Add Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
