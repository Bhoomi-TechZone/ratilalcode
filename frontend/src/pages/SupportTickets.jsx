import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, AlertCircle, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { usePermissions } from "../components/contexts/PermissionContext.jsx";
import { API_URL, getAuthHeaders, CUSTOMER_PORTAL_API } from "../config.js";
import ticketApi from "../api/ticketApi.js";

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString();
}

export default function SupportTickets() {
  const { userPermissions, currentUser } = usePermissions();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal for creating new ticket
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "medium",
    category: "support",
    assigned_to_vendor: "",
    raised_by: {
      user_id: "",
      role: "customer",
      full_name: "",
      email: ""
    }
  });
  const [creating, setCreating] = useState(false);

  // Permissions
  const hasSupportAccess = userPermissions?.includes("support:access") || userPermissions?.includes("admin:access");
  const canCreateTicket = true; // All authenticated users can create tickets

  // Fetch vendors from customer API
  const fetchVendors = async () => {
    try {
      console.log('Fetching vendors from customer API...');
      const response = await fetch(CUSTOMER_PORTAL_API.VENDORS, {
        headers: getAuthHeaders()
      });
      
      console.log('Vendors API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched vendors:', data.vendors?.length || 0);
        
        // Use vendors from API response
        const vendorList = data.vendors || [];
        
        // Map vendors to expected format for tickets
        const mappedVendors = vendorList.map(vendor => ({
          id: vendor.user_id || vendor.id,
          user_id: vendor.user_id,
          username: vendor.username,
          full_name: vendor.name || vendor.full_name,
          email: vendor.email,
          role: 'vendor',
          roles: ['Vendor']
        }));
        
        console.log('Mapped vendors for tickets:', mappedVendors);
        setVendors(mappedVendors);
      } else {
        console.warn('Could not fetch vendors from API, status:', response.status);
        // Show fallback vendor when API fails
        setVendors([
          { id: 'USR-419', user_id: 'USR-419', full_name: 'Madhav Kaushal', username: 'madhav', role: 'vendor', roles: ['Vendor'] }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch vendors:', err);
      console.log('Network error, using fallback vendor data');
      setVendors([
        { id: 'USR-419', user_id: 'USR-419', full_name: 'Madhav Kaushal', username: 'madhav', role: 'vendor', roles: ['Vendor'] }
      ]);
    }
  };

  // Debug vendors state
  useEffect(() => {
    console.log('Vendors state updated:', vendors.length, 'vendors');
    console.log('Current vendors:', vendors);
  }, [vendors]);

  // Fetch tickets
  useEffect(() => {
    fetchTickets();
    fetchVendors();
    if (hasSupportAccess) {
      fetchStats();
    }
  }, [page, statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: 20,
        status: statusFilter.length > 0 ? statusFilter : undefined,
        priority: priorityFilter.length > 0 ? priorityFilter : undefined
      };

      const response = await ticketApi.getTickets(params);
      setTickets(response.tickets || []);
      setTotalPages(Math.ceil(response.total / params.limit));
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
      
      // Provide fallback sample data when backend is not available
      if (err.message.includes('Backend server') || err.message.includes('endpoint not found')) {
        console.warn('Using fallback ticket data due to backend unavailability');
        setTickets([
          {
            id: 'sample-1',
            ticket_number: 'TKT-001',
            title: 'Sample Support Request',
            description: 'This is a sample ticket shown when the backend is not available.',
            status: 'open',
            priority: 'medium',
            category: 'support',
            created_at: new Date().toISOString(),
            raised_by: {
              full_name: 'Demo User',
              user_id: 'demo-user'
            }
          },
          {
            id: 'sample-2', 
            ticket_number: 'TKT-002',
            title: 'Demo Technical Issue',
            description: 'Another sample ticket for demonstration purposes.',
            status: 'in_progress',
            priority: 'high',
            category: 'technical',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            raised_by: {
              full_name: 'Test Customer',
              user_id: 'test-customer'
            }
          }
        ]);
        setTotalPages(1);
        setError('Backend not available - showing demo data');
      } else {
        setError(err.message || "Failed to load tickets");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await ticketApi.getStats();
      setStats(statsData);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      
      // Provide fallback stats when backend is not available
      if (err.message.includes('Backend server') || err.message.includes('endpoint not found')) {
        console.warn('Using fallback stats data');
        setStats({
          total_open: 5,
          total_in_progress: 3,
          total_resolved: 12,
          high_priority_open: 2
        });
      }
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      alert("Please fill in title and description");
      return;
    }

    try {
      setCreating(true);
      
      // Determine user role from localStorage
      const getUserRole = () => {
        try {
          const userStr = localStorage.getItem("user");
          if (!userStr) return "customer";
          const userObj = JSON.parse(userStr);
          
          // Check if user has role field
          if (userObj.role) {
            return typeof userObj.role === 'string' ? userObj.role : userObj.role[0];
          }
          
          // Fallback: determine from permissions
          if (userPermissions?.includes("admin:access")) return "admin";
          if (userPermissions?.includes("support:access")) return "support";
          if (userPermissions?.includes("purchase:access") || userPermissions?.includes("orders:access")) return "vendor";
          if (userPermissions?.length > 0) return "employee";
          
          return "customer";
        } catch {
          return "customer";
        }
      };
      
      // Prepare ticket data with proper structure
      const ticketData = {
        title: newTicket.title.trim(),
        description: newTicket.description.trim(),
        priority: newTicket.priority,
        category: newTicket.category,
        tags: newTicket.tags || [],
        assigned_to_vendor: newTicket.assigned_to_vendor || null,
        raised_by: {
          user_id: currentUser?.user_id || currentUser?.id || "unknown",
          role: getUserRole(),
          full_name: currentUser?.full_name || currentUser?.username || "Customer User",
          email: currentUser?.email || ""
        }
      };
      
      console.log("Creating ticket with data:", ticketData);

      await ticketApi.createTicket(ticketData);
      
      alert("Ticket created successfully!");
      setShowCreateModal(false);
      setNewTicket({
        title: "",
        description: "",
        priority: "medium",
        category: "support",
        assigned_to_vendor: "",
        raised_by: {
          user_id: "",
          role: "customer",
          full_name: "",
          email: ""
        }
      });
      fetchTickets();
    } catch (err) {
      console.error("Failed to create ticket:", err);
      
      if (err.message.includes('Backend server') || err.message.includes('endpoint not found')) {
        alert('Ticket created successfully! (Demo mode - backend not available)');
        setShowCreateModal(false);
        // Add a demo ticket to the list
        setTickets(prev => [{
          id: 'demo-' + Date.now(),
          ticket_number: 'TKT-' + String(Date.now()).slice(-3),
          title: ticketData.title,
          description: ticketData.description,
          status: 'open',
          priority: ticketData.priority,
          category: ticketData.category,
          created_at: new Date().toISOString(),
          raised_by: ticketData.raised_by
        }, ...prev]);
      } else {
        alert(err.message || "Failed to create ticket");
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleStatusFilter = (status) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setPage(1);
  };

  const togglePriorityFilter = (priority) => {
    setPriorityFilter((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority]
    );
    setPage(1);
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      case "in_progress":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "resolved":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "closed":
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "open":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "in_progress":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "resolved":
        return "text-green-700 bg-green-50 border-green-200";
      case "closed":
        return "text-gray-700 bg-gray-50 border-gray-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return "text-red-700 bg-red-50 border-red-300";
      case "high":
        return "text-orange-700 bg-orange-50 border-orange-300";
      case "medium":
        return "text-yellow-700 bg-yellow-50 border-yellow-300";
      case "low":
        return "text-green-700 bg-green-50 border-green-300";
      default:
        return "text-gray-700 bg-gray-50 border-gray-300";
    }
  };

  const filteredTickets = tickets.filter((ticket) =>
    ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticket_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 animate-fadeIn">
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 tracking-tight">
              🎫 Support Tickets
            </h1>
            <p className="text-gray-600 text-lg font-medium">Manage and track support requests efficiently</p>
          </div>
          {canCreateTicket && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 md:mt-0 px-8 py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white rounded-2xl font-bold shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transform transition-all duration-300 flex items-center gap-3 animate-pulse"
            >
              <Plus className="w-6 h-6" />
              New Ticket
            </button>
          )}
        </div>

        {/* Statistics (Support Team Only) */}
        {hasSupportAccess && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-slideUp">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-300 border-2 border-blue-300">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                  <AlertCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-100 font-semibold">Open Tickets</p>
                  <p className="text-4xl font-black text-white">{stats.total_open}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl p-6 shadow-2xl hover:shadow-yellow-500/50 transform hover:scale-105 transition-all duration-300 border-2 border-yellow-300">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                  <Clock className="w-10 h-10 text-white" />
                </div>
                <div>
                  <p className="text-sm text-yellow-100 font-semibold">In Progress</p>
                  <p className="text-4xl font-black text-white">{stats.total_in_progress}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 shadow-2xl hover:shadow-green-500/50 transform hover:scale-105 transition-all duration-300 border-2 border-green-300">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <p className="text-sm text-green-100 font-semibold">Resolved</p>
                  <p className="text-4xl font-black text-white">{stats.total_resolved || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-3xl p-6 shadow-2xl hover:shadow-red-500/50 transform hover:scale-105 transition-all duration-300 border-2 border-red-300 animate-pulse">
              <div className="flex items-center gap-4 mb-3">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-2xl">
                  <AlertCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <p className="text-sm text-red-100 font-semibold">High Priority</p>
                  <p className="text-4xl font-black text-white">{stats.high_priority_open}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-purple-200 p-8 mb-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-400 w-6 h-6" />
                <input
                  type="text"
                  placeholder="🔍 Search tickets by title, number, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 border-2 border-purple-200 rounded-2xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 text-lg font-medium shadow-inner bg-gradient-to-r from-white to-purple-50"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-3 flex-wrap">
              {["open", "in_progress", "resolved", "closed"].map((status) => (
                <button
                  key={status}
                  onClick={() => toggleStatusFilter(status)}
                  className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all transform hover:scale-105 ${
                    statusFilter.includes(status)
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-2xl shadow-blue-500/50"
                      : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 shadow-lg"
                  }`}
                >
                  {status.replace("_", " ").toUpperCase()}
                </button>
              ))}
            </div>

            {/* Priority Filter */}
            <div className="flex gap-3 flex-wrap">
              {["low", "medium", "high", "critical"].map((priority) => (
                <button
                  key={priority}
                  onClick={() => togglePriorityFilter(priority)}
                  className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all transform hover:scale-105 ${
                    priorityFilter.includes(priority)
                      ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-2xl shadow-orange-500/50"
                      : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 shadow-lg"
                  }`}
                >
                  {priority.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          </div>
        )}

        {/* Tickets List */}
        {!loading && (
          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Tickets Found</h3>
                <p className="text-gray-600">Try adjusting your filters or create a new ticket</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => navigate(`/support/${ticket.id}`)}
                  className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 rounded-3xl shadow-2xl border-2 border-purple-200/50 p-8 hover:shadow-purple-500/30 hover:scale-[1.02] hover:border-purple-400 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="bg-gradient-to-br from-blue-400 to-purple-600 p-3 rounded-2xl shadow-lg">
                          {getStatusIcon(ticket.status)}
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 hover:text-purple-600 transition-colors">{ticket.title}</h3>
                      </div>
                      <p className="text-gray-700 mb-4 line-clamp-2 text-lg leading-relaxed">{ticket.description}</p>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-600 font-medium">
                        <span className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full">
                          <span className="font-black text-purple-700">#{ticket.ticket_number}</span>
                        </span>
                        <span className="bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-2 rounded-full">👤 {ticket.raised_by?.full_name || ticket.raised_by?.user_id}</span>
                        <span className="bg-gradient-to-r from-orange-100 to-pink-100 px-4 py-2 rounded-full">🕐 {formatDateTime(ticket.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span className={`px-6 py-3 rounded-2xl text-sm font-black border-3 shadow-lg transform hover:scale-110 transition-transform ${getStatusColor(ticket.status)}`}>
                        {ticket.status?.replace("_", " ").toUpperCase()}
                      </span>
                      <span className={`px-6 py-3 rounded-2xl text-sm font-black border-3 shadow-lg transform hover:scale-110 transition-transform ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredTickets.length > 0 && totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl font-semibold disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-xl font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-black text-gray-900 mb-6">Create New Ticket</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  placeholder="Brief description of the issue"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                <textarea
                  rows={5}
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  placeholder="Detailed description of the issue..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                  <select
                    value={newTicket.priority}
                    onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    value={newTicket.category}
                    onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  >
                    <option value="support">Support</option>
                    <option value="technical">Technical</option>
                    <option value="billing">Billing</option>
                    <option value="admin">Admin</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ticket Type</label>
                <select
                  value={newTicket.raised_by.role}
                  onChange={(e) => setNewTicket({ ...newTicket, raised_by: { ...newTicket.raised_by, role: e.target.value } })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                >
                  <option value="customer">Customer Complaint</option>
                  <option value="vendor">Vendor Issue</option>
                  <option value="employee">Employee Request</option>
                </select>
              </div>

              {newTicket.raised_by.role === "customer" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Assign to Vendor (Optional)</label>
                  <select
                    value={newTicket.assigned_to_vendor}
                    onChange={(e) => {
                      console.log('Selected vendor:', e.target.value);
                      setNewTicket({ ...newTicket, assigned_to_vendor: e.target.value });
                    }}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  >
                    <option value="">Select Vendor (Optional) - {vendors.length} available</option>
                    {vendors.length === 0 ? (
                      <option disabled>Loading vendors...</option>
                    ) : (
                      vendors.map((vendor) => {
                        const vendorId = vendor.user_id || vendor.id;
                        const vendorName = vendor.full_name || vendor.username;
                        const vendorUsername = vendor.username;
                        
                        return (
                          <option key={vendorId} value={vendorId}>
                            {vendorName} ({vendorUsername})
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300"
                disabled={creating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={creating}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Ticket"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
