import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MessageCircle, Clock, User2, Info, Star, Loader2, AlertCircle } from "lucide-react";
import { usePermissions } from "../components/contexts/PermissionContext.jsx";
import ticketApi from "../api/ticketApi.js";

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleString();
}

export default function TicketDetails() {
  const { userPermissions, currentUser } = usePermissions();
  const { ticket_id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("Activity");
  const [activities, setActivities] = useState([]);
  const [history, setHistory] = useState([]);
  const [feedback, setFeedback] = useState([]);

  const [newMessage, setNewMessage] = useState("");
  const [responseSubmitting, setResponseSubmitting] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusUpdating, setStatusUpdating] = useState(false);
  
  // Role-specific states
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [assignToUser, setAssignToUser] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [quickResponseTemplate, setQuickResponseTemplate] = useState("");

  // Permissions & Role Detection - Use permission-based approach since role names aren't available
  const hasSupportAccess = userPermissions?.includes("support:access") || false;
  const hasAdminAccess = userPermissions?.includes("admin:access") || false;
  const hasHRAccess = userPermissions?.includes("hr:access") || false;
  const hasManagerAccess = userPermissions?.includes("manager:access") || false;
  const hasPurchaseAccess = userPermissions?.includes("purchase:access") || false;
  const hasOrdersAccess = userPermissions?.includes("orders:access") || false;
  
  // Determine role based on permissions
  // Customer: Only basic read permissions, no admin/support/hr/manager access
  // Vendor: Has purchase or orders access
  // Employee: Has dashboard access but not admin/support
  // Support: Has support:access
  // Admin: Has admin:access
  
  // Primary role determination (first match wins)
  const isAdmin = hasAdminAccess;
  const isSupport = hasSupportAccess && !hasAdminAccess;
  const isHR = hasHRAccess && !hasAdminAccess && !hasSupportAccess;
  const isManager = hasManagerAccess && !hasAdminAccess && !hasSupportAccess && !hasHRAccess;
  
  // Vendor has purchase/orders access
  const isVendor = (hasPurchaseAccess || hasOrdersAccess) && !hasAdminAccess && !hasSupportAccess && !hasHRAccess && !hasManagerAccess;
  
  // Employee has some access but not vendor/admin/support/hr/manager
  const isEmployee = !hasAdminAccess && !hasSupportAccess && !hasHRAccess && !hasManagerAccess && !isVendor && userPermissions && userPermissions.length > 0;
  
  // Customer has minimal or no special permissions
  const isCustomer = !hasAdminAccess && !hasSupportAccess && !hasHRAccess && !hasManagerAccess && !hasPurchaseAccess && !hasOrdersAccess;
  
  console.log("🔍 Role Detection:", {
    permissions: userPermissions,
    hasAdminAccess,
    hasSupportAccess,
    hasHRAccess,
    hasManagerAccess,
    hasPurchaseAccess,
    hasOrdersAccess,
    isAdmin,
    isSupport,
    isHR,
    isManager,
    isVendor,
    isEmployee,
    isCustomer
  });
  
  console.log("🎯 Detected Role:", 
    isAdmin ? "ADMIN" :
    isSupport ? "SUPPORT" :
    isHR ? "HR" :
    isManager ? "MANAGER" :
    isVendor ? "VENDOR" :
    isEmployee ? "EMPLOYEE" :
    isCustomer ? "CUSTOMER" :
    "UNKNOWN"
  );
  
  const canRespond = hasSupportAccess || hasAdminAccess || isVendor || isEmployee;
  const canUpdateStatus = hasAdminAccess || hasHRAccess || hasManagerAccess || hasSupportAccess;
  const canAssignTicket = hasAdminAccess || hasSupportAccess;
  const canEscalate = isEmployee || isCustomer;
  const canRate = isCustomer && ticket?.status?.toLowerCase() === "resolved";
  const showInternalNotes = hasAdminAccess || hasSupportAccess || hasHRAccess;

  // Load ticket data from API
  useEffect(() => {
    fetchTicket();
  }, [ticket_id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      setError("");
      
      const ticketData = await ticketApi.getTicket(ticket_id);
      
      // Process ticket data
      setTicket(ticketData);
      
      // Process resolution log into activities (filter internal notes for non-privileged users)
      const acts = [];
      if (ticketData.resolution_log && ticketData.resolution_log.length > 0) {
        ticketData.resolution_log.forEach((log, idx) => {
          // Skip internal notes if user doesn't have permission to see them
          const hasPermissionToSeeInternal = userPermissions?.includes("admin:access") || 
                                             userPermissions?.includes("support:access") || 
                                             userPermissions?.includes("hr:access");
          
          if (log.internal && !hasPermissionToSeeInternal) {
            return; // Skip this activity
          }
          
          acts.push({
            id: `log-${idx}`,
            action: log.internal ? "🔒 Internal Note" : "💬 Response",
            user: log.author_id || "System",
            details: log.message,
            time: formatDateTime(log.timestamp),
            internal: log.internal
          });
        });
      }
      
      // Add ticket creation as first activity
      acts.unshift({
        id: "created",
        action: "Ticket Created",
        user: `${ticketData.raised_by?.full_name || ticketData.raised_by?.user_id}`,
        details: ticketData.title,
        time: formatDateTime(ticketData.created_at),
      });
      setActivities(acts);

      // Process status history
      if (ticketData.status_history && ticketData.status_history.length > 0) {
        const hist = ticketData.status_history.map((sh, idx) => ({
          id: `status-${idx}`,
          status: sh.status,
          by: sh.changed_by,
          at: formatDateTime(sh.timestamp),
        }));
        setHistory(hist);
      }

      // Feedback - empty for now (can be added later)
      setFeedback([]);
      
    } catch (err) {
      console.error("Failed to fetch ticket:", err);
      setError(err.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  // Quick response templates for vendors
  const quickResponseTemplates = {
    investigating: "Thank you for reporting this issue. I am currently investigating and will update you shortly.",
    needInfo: "Could you please provide more details about this issue? Additional information will help me resolve this faster.",
    resolved: "This issue has been resolved. Please verify and let me know if you need any further assistance.",
    workaround: "While I work on a permanent solution, here's a temporary workaround you can use.",
  };

  const postResponse = async () => {
    if (!newMessage.trim()) return;

    try {
      setResponseSubmitting(true);
      
      const updatedTicket = await ticketApi.addResponse(ticket_id, newMessage, false);
      
      // Refresh ticket data
      await fetchTicket();
      
      setNewMessage("");
      setQuickResponseTemplate("");
      alert("Response posted successfully!");
    } catch (err) {
      console.error("Failed to post response:", err);
      alert(err.message || "Failed to post response");
    } finally {
      setResponseSubmitting(false);
    }
  };
  
  const handleQuickResponse = (template) => {
    setQuickResponseTemplate(template);
    setNewMessage(quickResponseTemplates[template]);
  };

  const updateStatus = async () => {
    if (!newStatus || !canUpdateStatus) return;

    try {
      setStatusUpdating(true);
      
      await ticketApi.updateStatus(ticket_id, newStatus);
      
      // Refresh ticket data
      await fetchTicket();
      
      setNewStatus("");
      alert("Status updated successfully!");
    } catch (err) {
      console.error("Failed to update status:", err);
      alert(err.message || "Failed to update status");
    } finally {
      setStatusUpdating(false);
    }
  };
  
  const handleEscalation = async () => {
    if (!escalationReason.trim()) {
      alert("Please provide a reason for escalation");
      return;
    }
    
    try {
      const escalationMessage = `🚨 ESCALATED: ${escalationReason}`;
      await ticketApi.addResponse(ticket_id, escalationMessage, false);
      await fetchTicket();
      setEscalationReason("");
      alert("Ticket escalated successfully!");
    } catch (err) {
      alert(err.message || "Failed to escalate ticket");
    }
  };
  
  const submitRating = async () => {
    if (rating === 0) {
      alert("Please select a rating");
      return;
    }
    
    try {
      const ratingMessage = `⭐ Customer Rating: ${rating}/5\nFeedback: ${ratingComment || "No additional feedback"}`;
      await ticketApi.addResponse(ticket_id, ratingMessage, false);
      await fetchTicket();
      setShowRatingModal(false);
      setRating(0);
      setRatingComment("");
      alert("Thank you for your feedback!");
    } catch (err) {
      alert(err.message || "Failed to submit rating");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600 mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Ticket</h2>
        <p className="text-gray-600 mb-4">Ticket #{ticket_id}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Ticket</h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/support")}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <Info className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ticket Not Found</h2>
          <p className="text-gray-600 mb-6">The ticket you're looking for doesn't exist</p>
          <button
            onClick={() => navigate("/support")}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  // Status style helper
  const statusColor = {
    resolved: "text-green-600 bg-green-50 border-green-200",
    "in progress": "text-yellow-700 bg-yellow-50 border-yellow-200",
    closed: "text-gray-600 bg-gray-50 border-gray-200",
    open: "text-blue-700 bg-blue-50 border-blue-200",
  }[ticket.status?.toLowerCase()] || "text-blue-700 bg-blue-50 border-blue-200";

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Sidebar */}
      <aside className="relative z-10 bg-white/80 backdrop-blur-2xl w-full md:w-96 px-8 py-12 border-b md:border-b-0 md:border-r-4 border-gradient-to-b from-blue-400 via-purple-400 to-pink-400 flex-shrink-0 flex flex-col shadow-2xl md:rounded-tr-[3rem] md:rounded-br-[3rem]">
        <button
          className="mb-10 px-6 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-2xl font-black shadow-2xl flex items-center justify-center gap-3 w-full hover:shadow-purple-500/80 hover:scale-105 hover:rotate-[-1deg] transform transition-all duration-300 group relative overflow-hidden"
          onClick={() => navigate(-1)}
        >
          <span className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          <span className="relative z-10 text-2xl group-hover:animate-pulse">←</span>
          <span className="relative z-10">Back to Tickets</span>
        </button>

        <div className="flex flex-col items-center mb-10 w-full">
          <div className="relative w-32 h-32 mb-6">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-spin-slow"></div>
            <div className="absolute inset-1 rounded-[1.8rem] bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl">
              <Info className="text-white w-16 h-16 animate-pulse" />
            </div>
          </div>
          
          {/* Role Badge */}
          <div className="mb-3 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide shadow-lg">
            {isAdmin && <span className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-4 py-2 rounded-full">👑 Admin View</span>}
            {isSupport && !isAdmin && <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-full">🎧 Support View</span>}
            {isHR && !isAdmin && !isSupport && <span className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-4 py-2 rounded-full">👥 HR View</span>}
            {isManager && !isAdmin && !isSupport && !isHR && <span className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white px-4 py-2 rounded-full">📊 Manager View</span>}
            {isVendor && <span className="bg-gradient-to-r from-orange-400 to-red-500 text-white px-4 py-2 rounded-full">🏪 Vendor View</span>}
            {isEmployee && <span className="bg-gradient-to-r from-blue-400 to-indigo-500 text-white px-4 py-2 rounded-full">👔 Employee View</span>}
            {isCustomer && <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-full">👤 Customer View</span>}
          </div>
          
          <div className="text-3xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 text-center break-words tracking-tight hover:scale-105 transition-transform duration-300">
            {ticket.title}
          </div>
          <span className={`rounded-2xl px-8 py-4 text-lg font-black mt-3 border-3 shadow-2xl hover:scale-110 transform transition-all duration-300 ${statusColor}`}>
            #{ticket.ticket_number}
          </span>
        </div>

        <section className="w-full space-y-4">
          <h3 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6 tracking-tight border-b-4 border-purple-200 pb-3">📋 Ticket Info</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center py-4 px-5 bg-gradient-to-r from-blue-100 via-blue-50 to-purple-100 rounded-2xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-2 border-blue-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse"></span>
                <span className="font-black text-gray-800">Status:</span>
              </div>
              <span className={`px-5 py-2 rounded-xl text-sm font-black border-2 shadow-lg hover:scale-110 transform transition-all ${statusColor}`}>
                {ticket.status?.toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between items-center py-4 px-5 bg-gradient-to-r from-purple-100 via-purple-50 to-pink-100 rounded-2xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-300 border-2 border-purple-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse"></span>
                <span className="font-black text-gray-800">Priority:</span>
              </div>
              <span className="font-black text-purple-700 text-xl px-4 py-1 bg-white/50 rounded-lg">{ticket.priority?.toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl hover:bg-gradient-to-r hover:from-green-100 hover:to-emerald-100 transition-all">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="font-bold text-gray-700">Created:</span>
              </div>
              <span className="text-gray-800 font-semibold">{formatDateTime(ticket.created_at)}</span>
            </div>
            <div className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl hover:bg-gradient-to-r hover:from-orange-100 hover:to-yellow-100 transition-all">
              <div className="flex items-center gap-2">
                <User2 className="w-4 h-4 text-orange-600" />
                <span className="font-bold text-gray-700">Raised By:</span>
              </div>
              <span className="font-bold text-gray-900 truncate max-w-[120px]">
                {ticket.raised_by?.full_name || ticket.raised_by?.user_id}
              </span>
            </div>
            {ticket.assigned_to && (
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold text-gray-600">Assigned:</span>
                <span className="font-medium text-blue-600">{ticket.assigned_to.full_name}</span>
              </div>
            )}
            {ticket.category && (
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold text-gray-600">Category:</span>
                <span className="font-medium text-gray-900">{ticket.category}</span>
              </div>
            )}
          </div>
        </section>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 md:p-12">
        {/* Tabs */}
        <nav className="flex gap-4 mb-10 flex-wrap border-b-4 border-gradient-to-r from-blue-400 via-purple-400 to-pink-400 pb-6 overflow-x-auto relative z-10">
          {[
            { label: "Activity", icon: <MessageCircle className="w-6 h-6" />, emoji: "💬" },
            { label: "History", icon: <Clock className="w-6 h-6" />, emoji: "📜" },
            { label: "Details", icon: <Info className="w-6 h-6" />, emoji: "📋" },
            { label: "Feedback", icon: <Star className="w-6 h-6" />, emoji: "⭐" },
          ].map(({ label, icon, emoji }) => (
            <button
              key={label}
              className={`relative flex items-center gap-3 px-10 py-5 rounded-2xl font-black transition-all duration-300 whitespace-nowrap transform hover:scale-110 hover:rotate-[-2deg] group ${
                activeTab === label
                  ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-2xl shadow-purple-500/50 scale-105"
                  : "bg-white/90 backdrop-blur-lg text-gray-700 hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 border-2 border-purple-300 hover:shadow-2xl hover:border-purple-500"
              }`}
              onClick={() => setActiveTab(label)}
            >
              {activeTab === label && (
                <span className="absolute -top-2 -right-2 text-2xl animate-bounce">{emoji}</span>
              )}
              <span className="group-hover:animate-wiggle">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Activity Tab */}
        {activeTab === "Activity" && (
          <section className="bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 backdrop-blur-xl rounded-[2rem] shadow-2xl border-3 border-purple-200 p-10">
            <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
              <h3 className="text-3xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">💬 Activity Feed</h3>
              <div className="flex gap-3 flex-wrap">
                {canRespond && <span className="text-sm bg-gradient-to-r from-green-400 to-emerald-500 text-white px-5 py-2 rounded-full font-black shadow-lg">✅ You can respond</span>}
                {canRate && (
                  <button
                    onClick={() => setShowRatingModal(true)}
                    className="text-sm bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-5 py-2 rounded-full font-black shadow-lg hover:scale-105 transition-transform"
                  >
                    ⭐ Rate Service
                  </button>
                )}
                {canEscalate && ticket?.status?.toLowerCase() !== "resolved" && ticket?.status?.toLowerCase() !== "closed" && (
                  <button
                    onClick={() => setActiveTab("Escalate")}
                    className="text-sm bg-gradient-to-r from-red-400 to-pink-500 text-white px-5 py-2 rounded-full font-black shadow-lg hover:scale-105 transition-transform"
                  >
                    🚨 Escalate
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6 mb-10 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gradient scrollbar-track-purple-100">
              {activities.map((act, index) => (
                <div 
                  key={act.id} 
                  className="group flex gap-6 p-7 bg-gradient-to-br from-white via-purple-50/50 to-pink-50/50 rounded-3xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 border-2 border-purple-200 hover:border-purple-400 relative overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mt-2 flex-shrink-0 shadow-lg group-hover:scale-125 transition-transform"></div>
                    <div className="absolute top-7 left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-purple-300 to-transparent"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-black text-purple-900 text-lg bg-purple-100 px-4 py-1 rounded-full">{act.action}</span>
                      <span className="text-sm text-purple-600 font-bold bg-purple-50 px-3 py-1 rounded-full">by {act.user}</span>
                    </div>
                    {act.details && (
                      <p className="text-gray-800 mb-4 whitespace-pre-wrap text-base leading-relaxed bg-white/80 p-4 rounded-xl border border-purple-100">
                        {act.details}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-purple-500 font-medium">
                      <Clock className="w-4 h-4" />
                      <span>{act.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {canRespond && (
              <div className="border-t-4 border-gradient-to-r from-blue-400 via-purple-400 to-pink-400 pt-8">
                {/* Quick Response Templates for Vendors */}
                {isVendor && (
                  <div className="mb-6">
                    <label className="block text-sm font-black text-purple-800 mb-3">⚡ Quick Response Templates</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button
                        onClick={() => handleQuickResponse('investigating')}
                        className="px-4 py-3 bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 text-blue-800 rounded-xl font-bold text-sm transition-all hover:scale-105 shadow-md"
                      >
                        🔍 Investigating
                      </button>
                      <button
                        onClick={() => handleQuickResponse('needInfo')}
                        className="px-4 py-3 bg-gradient-to-r from-yellow-100 to-yellow-200 hover:from-yellow-200 hover:to-yellow-300 text-yellow-800 rounded-xl font-bold text-sm transition-all hover:scale-105 shadow-md"
                      >
                        ❓ Need Info
                      </button>
                      <button
                        onClick={() => handleQuickResponse('resolved')}
                        className="px-4 py-3 bg-gradient-to-r from-green-100 to-green-200 hover:from-green-200 hover:to-green-300 text-green-800 rounded-xl font-bold text-sm transition-all hover:scale-105 shadow-md"
                      >
                        ✅ Resolved
                      </button>
                      <button
                        onClick={() => handleQuickResponse('workaround')}
                        className="px-4 py-3 bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-800 rounded-xl font-bold text-sm transition-all hover:scale-105 shadow-md"
                      >
                        🔧 Workaround
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="relative">
                  <textarea
                    rows={4}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="✍️ Type your response here..."
                    className="w-full p-6 border-3 border-purple-300 rounded-2xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 resize-vertical transition-all bg-gradient-to-br from-white to-purple-50/30 text-gray-800 font-medium placeholder:text-gray-400 shadow-inner"
                    disabled={responseSubmitting}
                  />
                  <div className="absolute bottom-4 right-4 text-sm text-gray-400 font-medium">
                    {newMessage.length} characters
                  </div>
                </div>
                <button
                  onClick={postResponse}
                  disabled={responseSubmitting || !newMessage.trim()}
                  className="mt-4 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-4 px-8 rounded-2xl font-black hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                  {responseSubmitting ? (
                    <><Loader2 className="w-6 h-6 animate-spin relative z-10" /> <span className="relative z-10">Posting...</span></>
                  ) : (
                    <><MessageCircle className="w-6 h-6 relative z-10" /> <span className="relative z-10 text-lg">Post Response</span></>
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {/* History Tab */}
        {activeTab === "History" && (
          <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Status History</h3>
              {canUpdateStatus && <span className="text-xs bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-medium">✅ Can update status</span>}
            </div>

            <div className="space-y-3 mb-8 max-h-80 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border-l-4 border-blue-400">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      h.status === "Resolved"
                        ? "bg-green-100 text-green-800"
                        : h.status === "In Progress"
                        ? "bg-yellow-100 text-yellow-800"
                        : h.status === "Closed"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {h.status}
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-gray-700">Changed by {h.by}</span>
                    <span className="text-sm text-gray-500 ml-2">• {h.at}</span>
                  </div>
                </div>
              ))}
            </div>

            {canUpdateStatus && (
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200">
                  <label className="block text-sm font-bold text-purple-800 mb-3">📊 Update Status</label>
                  <div className="flex gap-3">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="flex-1 p-3 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-400"
                      disabled={statusUpdating}
                    >
                      <option value="">Select new status...</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                    <button
                      onClick={updateStatus}
                      disabled={statusUpdating || !newStatus}
                      className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all whitespace-nowrap flex items-center gap-2"
                    >
                      {statusUpdating ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : "Update Status"}
                    </button>
                  </div>
                </div>
                
                {/* Admin Assignment Controls */}
                {canAssignTicket && (
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200">
                    <label className="block text-sm font-bold text-blue-800 mb-3">👤 Assign Ticket (Admin)</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={assignToUser}
                        onChange={(e) => setAssignToUser(e.target.value)}
                        placeholder="Enter user ID or email..."
                        className="flex-1 p-3 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                      />
                      <button
                        onClick={() => alert('Assignment feature - connect to backend API')}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Details Tab */}
        {activeTab === "Details" && (
          <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <h3 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Ticket Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <Info className="w-5 h-5" /> Title
                </h4>
                <p className="text-gray-800 font-medium">{ticket.title}</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200">
                <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                  <User2 className="w-5 h-5" /> Raised By
                </h4>
                <p className="text-gray-800 font-medium">{ticket.raised_by?.full_name || ticket.raised_by?.user_id}</p>
              </div>

              <div className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                <h4 className="font-bold text-yellow-900 mb-2 flex items-center gap-2">Priority</h4>
                <p className="text-gray-800 font-bold text-lg">{ticket.priority}</p>
              </div>

              {ticket.assigned_to && (
                <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 md:col-span-2 lg:col-span-1">
                  <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">Assigned To</h4>
                  <p className="text-gray-800 font-medium">{ticket.assigned_to.full_name}</p>
                </div>
              )}

              <div className="md:col-span-2 lg:col-span-3 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2">Description</h4>
                <div className="prose max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Escalate Tab */}
        {activeTab === "Escalate" && canEscalate && (
          <section className="bg-gradient-to-br from-white via-red-50/30 to-pink-50/30 backdrop-blur-xl rounded-[2rem] shadow-2xl border-3 border-red-200 p-10">
            <div className="text-center mb-8">
              <div className="inline-block p-4 bg-gradient-to-r from-red-400 to-pink-500 rounded-full mb-4">
                <AlertCircle className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-3xl font-black bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent tracking-tight mb-2">🚨 Escalate Ticket</h3>
              <p className="text-gray-600 text-sm">This will notify higher authorities about your urgent concern</p>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-red-800 mb-3">Reason for Escalation *</label>
                <textarea
                  rows={5}
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  placeholder="Please describe why this ticket needs immediate attention..."
                  className="w-full p-6 border-3 border-red-300 rounded-2xl focus:ring-4 focus:ring-red-300 focus:border-red-500 resize-vertical transition-all bg-white text-gray-800 font-medium placeholder:text-gray-400"
                />
              </div>
              
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5">
                <p className="text-sm text-yellow-800 font-semibold">⚠️ <strong>Note:</strong> Escalation should be used only for urgent matters that require immediate attention. Misuse may result in delayed responses.</p>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={handleEscalation}
                  disabled={!escalationReason.trim()}
                  className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 text-white py-4 px-8 rounded-2xl font-black hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-red-500/50 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <AlertCircle className="w-6 h-6" />
                  <span className="text-lg">Escalate Now</span>
                </button>
                <button
                  onClick={() => setActiveTab('Activity')}
                  className="px-8 py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}
        
        {/* Feedback Tab */}
        {activeTab === "Feedback" && (
          <section className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Customer Feedback</h3>
            <div className="space-y-4">
              {feedback.map((f) => (
                <div key={f.id} className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${i < f.rating ? "text-yellow-400 fill-yellow-400" : "text-yellow-200"}`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900 text-lg">{f.rating}/5</span>
                  </div>
                  <p className="text-gray-800 mb-4 italic">"{f.comment}"</p>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <User2 className="w-4 h-4" />
                    {f.by}, {f.at}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      
      {/* Rating Modal for Customers */}
      {showRatingModal && canRate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 relative animate-slideUp">
            <button
              onClick={() => setShowRatingModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
            
            <div className="text-center mb-6">
              <div className="inline-block p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4">
                <Star className="w-10 h-10 text-white fill-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Rate Your Experience</h3>
              <p className="text-gray-600 text-sm">Help us improve our service</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3 text-center">How satisfied are you?</label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-12 h-12 ${
                        star <= rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center mt-3 font-bold text-lg text-purple-600">
                  {rating === 5 && "🌟 Excellent!"}
                  {rating === 4 && "😊 Great!"}
                  {rating === 3 && "🙂 Good"}
                  {rating === 2 && "😕 Could be better"}
                  {rating === 1 && "😞 Needs improvement"}
                </p>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">Additional Comments (Optional)</label>
              <textarea
                rows={4}
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Tell us more about your experience..."
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-yellow-100 focus:border-yellow-400 resize-vertical transition-all"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={submitRating}
                disabled={rating === 0}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-3 px-6 rounded-xl font-bold hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Submit Rating
              </button>
              <button
                onClick={() => setShowRatingModal(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
