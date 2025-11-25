import React, { useState, useEffect } from "react";

// Loader Spinner
function Loader() {
  return (
    <div className="w-full flex justify-center py-16">
      <span className="text-blue-600 font-semibold animate-pulse text-lg">Loading...</span>
    </div>
  );
}

// Utility: Timeline
function getTimeline(dateString) {
  if (!dateString) return "--";
  const d = new Date(dateString);
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

// The Task Table for employees (read-only)
// The Task Table for employees (read-only)
function EmployeeTasksTable({ tasks, siteOptions }) {
  const sortedTasks = [...tasks].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return (
    <div className="w-full max-w-7xl bg-white shadow-lg rounded-2xl mx-auto p-4 sm:p-8 my-10 border border-blue-100">
      <h2 className="text-xl sm:text-2xl font-semibold text-blue-700 mb-6">Recent Tasks</h2>
      {sortedTasks.length === 0 ? (
        <div className="text-gray-500 text-center py-10">No tasks assigned to you yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-blue-50">
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase text-left w-1/6">Date</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase text-left w-2/6">Task</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase text-left w-2/6">Assigned By</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase text-left w-1/6">Site</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase text-left w-1/6">Timeline</th>
                <th className="py-3 px-4 text-blue-600 font-bold text-xs uppercase text-center w-1/6">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => {
                const id = task.id || task._id || task.task_id;
                return (
                  <tr key={id} className="border-b last:border-none hover:bg-blue-50 transition">
                    <td className="py-3 px-4 text-gray-600 text-left w-1/6">
                      {!!task.created_at ? new Date(task.created_at).toLocaleDateString() : "--"}
                    </td>
                    <td className="py-3 px-4 text-gray-800 font-medium text-left w-2/6">{task.title}</td>
                    <td className="py-3 px-4 text-gray-700 text-left w-2/6">{task.assigned_by_role || "--"}</td>
                    <td className="py-3 px-4 text-gray-700 text-left w-1/6">{task.site_name || "--"}</td>
                    <td className="py-3 px-4 text-gray-700 text-left w-1/6">{getTimeline(task.created_at)}</td>
                    <td className="py-3 px-4 text-center w-1/6">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 border-gray-300">
                        {task.status?.charAt(0).toUpperCase() + task.status?.slice(1) || "Pending"}
                      </span>
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

// Main Employee Task Viewer
function EmployeeTaskView() {
  const [tasks, setTasks] = useState([]);
  const [siteOptions, setSiteOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Get current user object from localStorage
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

  useEffect(() => {
    fetchSites();
    fetchTasks();
    // eslint-disable-next-line
  }, []);

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
      setSiteOptions([]);
    }
  }

  // Helper: fetch role name from role_id
  async function fetchRoleName(roleId) {
    if (!roleId) return "--";
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(`http://localhost:3005/api/roles/${roleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return "--";
      const data = await res.json();
      return data.name || data.role_name || "--";
    } catch {
      return "--";
    }
  }

  // Fetch assigner user, get its role_id, fetch role name
  async function fetchUserRoleName(userId) {
    if (!userId) return "--";
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(`http://localhost:3005/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return "--";
      const user = await res.json();
      // Your API has role_ids as an array
      const roleId = user.role_ids?.[0];
      if (!roleId) return "--";
      // Now fetch the role name
      return await fetchRoleName(roleId);
    } catch {
      return "--";
    }
  }

  async function fetchTasks() {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch("http://localhost:3005/api/tasks/mytasks", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch tasks.");
      let data = await res.json();
      if (!Array.isArray(data)) data = [];
      // For each task, fetch assigner’s role and attach
      const tasksWithRoles = await Promise.all(
        data.map(async (t) => ({
          ...t,
          id: t.id || t.task_id || undefined,
          created_at: t.created_at || "",
          linked_id: t.linked_id || "",
          status: t.status || "pending",
          assigned_by_role: await fetchUserRoleName(t.created_by),
        }))
      );
      setTasks(tasksWithRoles);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-2 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-8xl mx-auto">
        <div className="mb-8">
          <div className="text-sm text-gray-500 mb-2">
            <span className="text-blue-600">Tasks Management</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">Manage Your Tasks</h2>
          </div>
          <p className="mt-2 text-gray-500">See all your currently assigned tasks and reminders.</p>
        </div>
        {loading ? (
          <Loader />
        ) : (
          <EmployeeTasksTable
            tasks={tasks}
            siteOptions={siteOptions}
          />
        )}
      </div>
    </div>
  );
}

export default EmployeeTaskView;
