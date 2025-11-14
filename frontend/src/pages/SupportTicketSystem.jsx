import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const API_BASE = "http://localhost:3005/api/tickets/";
const USERS_API = "http://localhost:3005/api/auth/users/";

const PRIORITY_OPTIONS = [
  { value: "Low", color: "bg-green-100 text-green-700" },
  { value: "Medium", color: "bg-yellow-100 text-yellow-700" },
  { value: "High", color: "bg-red-100 text-red-700" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "bg-blue-100 text-blue-700" },
  { value: "in_progress", label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  { value: "resolved", label: "Resolved", color: "bg-green-100 text-green-700" },
  { value: "closed", label: "Closed", color: "bg-gray-100 text-gray-600" },
];

const NAV_SECTIONS = [
  { key: "register", name: "Register Complaint" },
  { key: "list", name: "All Tickets" },
  { key: "pending", name: "Pending/Active" },
  { key: "closed", name: "Closed/Feedback" },
];

const PAGE_SIZE = 10;

// Notification component
function Notification({ status, message, onClose }) {
  let colorClasses = {
    success: "bg-green-100 text-green-700 border-green-300",
    error: "bg-red-100 text-red-700 border-red-300",
    info: "bg-blue-100 text-blue-700 border-blue-300",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-300"
  };
  
  return message ? (
    <div className={`p-4 mb-4 rounded-lg border ${colorClasses[status] || colorClasses.info} relative`}>
      <button 
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" 
        onClick={onClose}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
      <div className="flex items-start">
        {status === "success" && (
          <svg className="h-5 w-5 mr-2 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === "error" && (
          <svg className="h-5 w-5 mr-2 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {status === "info" && (
          <svg className="h-5 w-5 mr-2 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {status === "warning" && (
          <svg className="h-5 w-5 mr-2 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        <div>{message}</div>
      </div>
    </div>
  ) : null;
}

// Helper functions
function statusLabel(status) {
  return STATUS_OPTIONS.find(s => s.value === status)?.label || status;
}

function statusColor(status) {
  return STATUS_OPTIONS.find(s => s.value === status)?.color || "bg-gray-100 text-gray-800";
}

function getDisplayTicketId(ticket) {
  if (ticket.ticket_number) {
    return ticket.ticket_number;
  }
  const rawId = ticket.id || ticket._id || "";
  if (/^[a-f0-9]{24}$/i.test(rawId)) {
    return "TKT-" + rawId.substring(0, 6).toUpperCase();
  }
  return rawId || "N/A";
}

// --- TICKET ROW COMPONENT ---
function TicketRow({ ticket, onUpdateStatus, onUpdateAssignee, users }) {
  const prioStyle = PRIORITY_OPTIONS.find(p => p.value === ticket.priority)?.color;
  const statusData = STATUS_OPTIONS.find(s => s.value === ticket.status);
  const statusStyle = statusData?.color;
  const tid = ticket.ticket_number || ticket.id || ticket._id;
  const displayTicketId = getDisplayTicketId(ticket);
  const [editStatus, setEditStatus] = useState(ticket.status);
  const [editAssignee, setEditAssignee] = useState(ticket.user_id || "");

  React.useEffect(() => { 
    setEditStatus(ticket.status); 
    setEditAssignee(ticket.user_id || "");
  }, [ticket.status, ticket.user_id]);

  return (
    <tr className="border-b hover:bg-blue-50 transition-colors">
      <td className="px-3 py-2 font-mono text-xs text-blue-700">
        <Link to={`/tickets/${tid}`} className="hover:underline" title={tid}>  
          {displayTicketId}
        </Link>
      </td>
      <td className="px-3 py-2">{ticket.title}</td>
      <td className="px-3 py-2">
        <span className={`px-2 py-1 rounded text-xs font-semibold ${prioStyle}`}>
          {ticket.priority}
        </span>
      </td>
      <td className="px-3 py-2">{ticket.category || "-"}</td>
      <td className="px-3 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            value={editAssignee}
            className="border rounded-md text-xs px-2 py-1"
            style={{ minWidth: 120 }}
            onChange={e => setEditAssignee(e.target.value)}
            disabled={ticket.status === "closed"}
          >
            <option value="">Select User</option>
            {users.map(user => (
              <option key={user._id || user.id} value={user.email || user.username || user._id}>
                {user.full_name || user.name || user.username || user.email}
              </option>
            ))}
          </select>
          {ticket.status !== "closed" && editAssignee !== ticket.user_id && (
            <button
              className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded transition"
              onClick={() => {
                if (editAssignee !== ticket.user_id) {
                  onUpdateAssignee(tid, editAssignee);
                }
              }}
            >
              Update
            </button>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-semibold ${statusStyle}`}>
            {statusData?.label || ticket.status}
          </span>
          <select
            value={editStatus}
            className="border rounded-md text-xs px-1 py-1"
            style={{ minWidth: 90 }}
            onChange={e => setEditStatus(e.target.value)}
            disabled={ticket.status === "closed"}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {ticket.status !== "closed" && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition"
              onClick={() => {
                if (editStatus !== ticket.status) {
                  onUpdateStatus(tid, editStatus);
                }
              }}
              disabled={editStatus === ticket.status}
            >
              Update Status
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// --- TICKET TABLE COMPONENT ---
function TicketTableTab({ tickets, onUpdateStatus, onUpdateAssignee, users }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(tickets.length / PAGE_SIZE);
  const paginatedTickets = tickets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [tickets]);

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="text-lg font-semibold text-blue-700 mb-4 flex items-center gap-2">
        <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7 20h10M7 4h10v16H7z" />
        </svg>
        Ticket List & Status
      </h3>
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[700px] divide-y divide-gray-200 text-xs sm:text-sm">
          <thead>
            <tr className="bg-blue-50 text-gray-700 text-sm">
              <th className="px-3 py-2 text-left">Ticket ID</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Priority</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Assign To</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTickets.length === 0 && (
              <tr>
                <td colSpan={6} className="text-gray-400 text-center py-5">
                  No tickets found.
                </td>
              </tr>
            )}
            {paginatedTickets.map((ticket) => (
              <TicketRow
                key={ticket.id || ticket._id || ticket.ticket_number}
                ticket={ticket}
                onUpdateStatus={onUpdateStatus}
                onUpdateAssignee={onUpdateAssignee}
                users={users}
              />
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end mt-5 gap-4">
          <span className="text-gray-700 text-sm font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            className={`px-4 py-2 rounded font-semibold transition border ${
              page === 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <button
            className={`px-4 py-2 rounded font-semibold transition border ${
              page === totalPages
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

// --- REGISTER TICKET COMPONENT ---
function RegisterComplaintTab({ form, setForm, registerTicket, loading, errorMsg, users }) {
  return (
    <div className="bg-white rounded-lg shadow p-5 mb-8">
      <h3 className="text-lg font-semibold text-blue-700 mb-3 flex items-center gap-2">
        <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} fill="none"/>
        </svg>
        Register Complaint
      </h3>
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg border border-red-300 flex items-start">
          <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-5">
        <input
          className="border rounded-md p-2 focus:ring-2 focus:ring-blue-300"
          name="title"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Title"
          required
        />
        <input
          className="border rounded-md p-2 focus:ring-2 focus:ring-blue-300"
          name="category"
          value={form.category}
          onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          placeholder="Category"
          required
        />
        <select
          className="border rounded-md p-2 focus:ring-2 focus:ring-blue-300"
          name="user_id"
          value={form.user_id}
          onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
          required
        >
          <option value="">Select User to Assign</option>
          {users.map(user => (
            <option key={user._id || user.id} value={user.email || user.username || user._id}>
              {user.full_name || user.name || user.username || user.email}
            </option>
          ))}
        </select>
        <select
          className="border rounded-md p-2 focus:ring-2 focus:ring-blue-300"
          name="priority"
          value={form.priority}
          onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
          required
        >
          <option value="">Select Priority</option>
          {PRIORITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.value}</option>
          ))}
        </select>
        <button
          onClick={registerTicket}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold transition"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
export default function SupportTicketSystem() {
  const [activeTab, setActiveTab] = useState("register");
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    priority: "",
    category: "",
    user_id: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [notification, setNotification] = useState({ status: "", message: "" });

  const fetchTickets = () => {
    fetch(API_BASE)
      .then(res => res.json())
      .then(data => setTickets(data))
      .catch(() => setTickets([]));
  };

  const fetchUsers = () => {
    fetch(USERS_API)
      .then(res => res.json())
      .then(data => {
        let usersArray = data;
        if (data.users) usersArray = data.users;
        if (data.data) usersArray = data.data;
        if (data.results) usersArray = data.results;

        // Filter out users with "customer" or "franchise" roles
        const filteredUsers = usersArray.filter(
          user =>
            Array.isArray(user.roles) &&
            !user.roles.some(
              r => 
                r.id === "customer" || 
                r.name === "customer" || 
                r.id === "franchise" || 
                r.name === "franchise"
            )
        );
        setUsers(filteredUsers);
      })
      .catch(() => {
        setUsers([]);
        setNotification({
          status: "error",
          message: "Failed to load users list."
        });
      });
  };

  useEffect(() => {
    fetchTickets();
    fetchUsers();
  }, []);

  const registerTicket = () => {
    if (!form.title || !form.priority || !form.category || !form.user_id) {
      setNotification({
        status: "error",
        message: "Please fill in all required fields."
      });
      return;
    }
    setLoading(true);
    setErrorMsg("");
    fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        priority: form.priority,
        category: form.category,
        user_id: form.user_id,
      }),
    })
      .then(async res => {
        if (!res.ok) {
          let err;
          try {
            err = await res.json();
          } catch {
            err = { detail: await res.text() };
          }
          throw err;
        }
        return res.json();
      })
      .then(() => {
        setForm({ title: "", priority: "", category: "", user_id: "" });
        setActiveTab("list");
        fetchTickets();
        setNotification({
          status: "success",
          message: "Ticket registered successfully!"
        });
        setTimeout(() => {
          setNotification({ status: "", message: "" });
        }, 5000);
      })
      .catch(err => {
        setErrorMsg(err.detail || "Failed to create ticket");
        setNotification({
          status: "error",
          message: err.detail || "Failed to create ticket"
        });
      })
      .finally(() => setLoading(false));
  };

  const updateStatus = (id, newStatus) => {
    if (!id || !newStatus) return;
    fetch(`${API_BASE}${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, ...(newStatus === "closed" ? { closed_at: new Date().toISOString() } : {}) }),
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to update status");
        return res.json();
      })
      .then(() => {
        fetchTickets();
        setNotification({
          status: "success",
          message: "Status updated successfully!"
        });
        setTimeout(() => {
          setNotification({ status: "", message: "" });
        }, 5000);
      })
      .catch(() => {
        setNotification({
          status: "error",
          message: "Failed to update status."
        });
      });
  };

  const updateAssignee = (id, newAssignee) => {
    if (!id || !newAssignee) return;
    fetch(`${API_BASE}${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: newAssignee }),
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to update assignee");
        return res.json();
      })
      .then(() => {
        fetchTickets();
        setNotification({
          status: "success",
          message: "Assignee updated successfully!"
        });
        setTimeout(() => {
          setNotification({ status: "", message: "" });
        }, 5000);
      })
      .catch(() => {
        setNotification({
          status: "error",
          message: "Failed to update assignee."
        });
      });
  };

  let filteredTickets = tickets;
  if (activeTab === "pending") {
    filteredTickets = tickets.filter(t => t.status === "open" || t.status === "in_progress");
  }
  if (activeTab === "closed") {
    filteredTickets = tickets.filter(t => t.status === "closed");
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 px-2 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {notification.message && (
          <Notification 
            status={notification.status}
            message={notification.message}
            onClose={() => setNotification({ status: "", message: "" })}
          />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 mb-1">
              Support Ticket System
            </h2>
            <p className="text-gray-500 text-base">
              Complaint registration, auto ticket number, priority, timeline, feedback – all in one place.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 bg-white mb-8">
          <nav className="flex flex-wrap gap-2 p-2">
            {NAV_SECTIONS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-2 px-4 font-medium text-sm rounded-t transition ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Dynamic Tab Content */}
        {activeTab === "register" && (
          <RegisterComplaintTab
            form={form}
            setForm={setForm}
            registerTicket={registerTicket}
            loading={loading}
            errorMsg={errorMsg}
            users={users}
          />
        )}
        {(activeTab === "list" || activeTab === "pending" || activeTab === "closed") && (
          <TicketTableTab
            tickets={filteredTickets}
            onUpdateStatus={updateStatus}
            onUpdateAssignee={updateAssignee}
            users={users}
          />
        )}
      </div>
    </div>
  );
}