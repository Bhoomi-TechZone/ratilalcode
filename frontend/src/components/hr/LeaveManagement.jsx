import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const API_BASE_URL = "http://localhost:8005";

const HRLeaveManagement = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLeaveType, setFilterLeaveType] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [actionForm, setActionForm] = useState({
    action: '',
    remarks: ''
  });
  const [balanceForm, setBalanceForm] = useState({
    employee_id: '',
    sick_leave: 0,
    casual_leave: 0,
    annual_leave: 0
  });
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0
  });

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          toast.error("No access token found");
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          
          // Check if user is HR/Admin - more comprehensive role checking
          const userRoles = Array.isArray(userData.roles) 
            ? userData.roles.map(r => typeof r === 'string' ? r.toLowerCase() : (r.name || '').toLowerCase())
            : typeof userData.roles === 'string' 
            ? [userData.roles.toLowerCase()] 
            : [];
          
          // Check for HR or Admin roles with more flexible matching
          const isHR = userRoles.some(role => 
            role.includes('hr') || 
            role.includes('human') || 
            role.includes('human_resources') ||
            role.includes('human resource')
          );
          const isAdmin = userRoles.includes('admin') || userRoles.includes('administrator') || userRoles.includes('superuser');
          
          if (!isHR && !isAdmin) {
            toast.error("Access denied. HR or Admin role required.");
            setIsLoading(false);
            return;
          }
          
          fetchAllData();
        } else {
          toast.error("Failed to fetch user data");
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
        toast.error("Error loading user data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchLeaveRequests(),
      fetchEmployees()
    ]);
  };

  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem("access_token");
      // Use the correct endpoint for HR/admin leave requests
      const response = await fetch(`${API_BASE_URL}/api/leave-requests/all-admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("API Response:", data); // Debug log
        
        // Handle various possible response formats
        let requests = [];
        if (Array.isArray(data)) {
          requests = data;
        } else if (data && typeof data === 'object') {
          // Check for common response structure patterns
          if (Array.isArray(data.data)) {
            requests = data.data;
          } else if (Array.isArray(data.leave_requests)) {
            requests = data.leave_requests;
          } else if (data.success && Array.isArray(data.data)) {
            requests = data.data;
          }
        }
        
        // Ensure we always have an array
        if (!Array.isArray(requests)) {
          requests = [];
        }
        
        setLeaveRequests(requests);
        calculateStats(requests);
      } else {
        console.error("Failed to fetch leave requests, status:", response.status);
        const errorData = await response.json();
        toast.error("Failed to load leave requests: " + (errorData.detail || "Server error"));
        setLeaveRequests([]);
        calculateStats([]);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      toast.error("Failed to load leave requests: " + error.message);
      setLeaveRequests([]);
      calculateStats([]);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/hr/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Employees API Response:", data); // Debug log
        
        // Handle various possible response formats
        let employeesData = [];
        if (Array.isArray(data)) {
          employeesData = data;
        } else if (data && typeof data === 'object') {
          // Check for common response structure patterns
          if (Array.isArray(data.data)) {
            employeesData = data.data;
          } else if (Array.isArray(data.employees)) {
            employeesData = data.employees;
          } else if (data.success && Array.isArray(data.data)) {
            employeesData = data.data;
          }
        }
        
        // Ensure we always have an array
        if (!Array.isArray(employeesData)) {
          employeesData = [];
        }
        
        setEmployees(employeesData);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const calculateStats = (requests) => {
    // Ensure requests is an array before trying to filter
    if (!Array.isArray(requests)) {
      console.error("calculateStats called with non-array:", requests);
      setStats({
        pending: 0,
        approved: 0,
        rejected: 0,
        total: 0
      });
      return;
    }
    
    setStats({
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      total: requests.length
    });
  };

  const getFilteredRequests = () => {
    // Ensure leaveRequests is an array before trying to spread it
    if (!Array.isArray(leaveRequests)) {
      console.error("getFilteredRequests called with non-array:", leaveRequests);
      return [];
    }
    
    let filtered = [...leaveRequests];
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    
    if (filterLeaveType !== 'all') {
      filtered = filtered.filter(r => r.leave_type === filterLeaveType);
    }
    
    return filtered.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date);
    });
  };

  const handleActionClick = (request, action) => {
    setSelectedRequest(request);
    setActionForm({
      action: action,
      remarks: ''
    });
    setShowActionModal(true);
  };

  const handleSubmitAction = async () => {
    if (!actionForm.action) {
      toast.error("Please select an action");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/api/hr/leave-requests/${selectedRequest._id || selectedRequest.id}/${actionForm.action}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reviewed_by: currentUser?.full_name || currentUser?.username,
            remarks: actionForm.remarks
          })
        }
      );

      if (response.ok) {
        toast.success(`Leave request ${actionForm.action}d successfully`);
        setShowActionModal(false);
        fetchLeaveRequests();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || `Failed to ${actionForm.action} leave request`);
      }
    } catch (error) {
      console.error(`Error ${actionForm.action}ing leave:`, error);
      toast.error(`Error ${actionForm.action}ing leave request`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBalance = async () => {
    if (!balanceForm.employee_id) {
      toast.error("Please select an employee");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/api/hr/leave-balance/${balanceForm.employee_id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sick_leave: parseInt(balanceForm.sick_leave),
            casual_leave: parseInt(balanceForm.casual_leave),
            annual_leave: parseInt(balanceForm.annual_leave)
          })
        }
      );

      if (response.ok) {
        toast.success("Leave balance updated successfully");
        setShowBalanceModal(false);
        setBalanceForm({
          employee_id: '',
          sick_leave: 0,
          casual_leave: 0,
          annual_leave: 0
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to update leave balance");
      }
    } catch (error) {
      console.error("Error updating leave balance:", error);
      toast.error("Error updating leave balance");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: 'clock', label: 'Pending' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: 'check-circle', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: 'times-circle', label: 'Rejected' }
    };
    
    const { bg, text, icon, label } = config[status?.toLowerCase()] || config.pending;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
        <i className={`fas fa-${icon} mr-1.5`}></i>
        {label}
      </span>
    );
  };

  const getLeaveTypeBadge = (type) => {
    const config = {
      'sick leave': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'casual leave': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'annual leave': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      'emergency leave': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
    };
    
    const normalized = type?.toLowerCase() || 'casual leave';
    const { bg, text, border } = config[normalized] || config['casual leave'];
    
    return (
      <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${bg} ${text} ${border}`}>
        {type}
      </span>
    );
  };

  const calculateDays = (startDate, endDate) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    } catch {
      return 0;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const filteredRequests = getFilteredRequests();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <i className="fas fa-calendar-check text-indigo-600 mr-3"></i>
                HR Leave Management
              </h1>
              <p className="text-gray-600 mt-2">Manage employee leave requests and balances</p>
            </div>
            <button
              onClick={() => setShowBalanceModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              <i className="fas fa-edit"></i>
              Update Leave Balance
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <div className="flex items-center justify-between mb-1">
                <i className="fas fa-clock text-lg text-yellow-500"></i>
                <span className="text-xl font-bold text-yellow-900">{stats.pending}</span>
              </div>
              <p className="text-xs font-medium text-yellow-700">Pending</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <i className="fas fa-check-circle text-lg text-green-500"></i>
                <span className="text-xl font-bold text-green-900">{stats.approved}</span>
              </div>
              <p className="text-xs font-medium text-green-700">Approved</p>
            </div>
            
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <div className="flex items-center justify-between mb-1">
                <i className="fas fa-times-circle text-lg text-red-500"></i>
                <span className="text-xl font-bold text-red-900">{stats.rejected}</span>
              </div>
              <p className="text-xs font-medium text-red-700">Rejected</p>
            </div>
            
            <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
              <div className="flex items-center justify-between mb-1">
                <i className="fas fa-list text-lg text-indigo-500"></i>
                <span className="text-xl font-bold text-indigo-900">{stats.total}</span>
              </div>
              <p className="text-xs font-medium text-indigo-700">Total</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-lg p-6 mb-6"
      >
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <i className="fas fa-filter text-indigo-600 mr-2"></i>
          Filters
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
            <select
              value={filterLeaveType}
              onChange={(e) => setFilterLeaveType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Annual Leave">Annual Leave</option>
              <option value="Emergency Leave">Emergency Leave</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Leave Requests Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-lg overflow-hidden"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <i className="fas fa-table text-indigo-600 mr-2"></i>
            Leave Requests ({filteredRequests.length})
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Employee Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Leave Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">From</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">To</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Total Days</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((request, index) => (
                    <motion.tr
                      key={request._id || request.id || index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm mr-3">
                            {(request.user_name || request.employee_name || 'U').charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {request.user_name || request.employee_name || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getLeaveTypeBadge(request.leave_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(request.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(request.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 text-blue-800 rounded-full font-bold text-sm">
                          {request.days || calculateDays(request.start_date, request.end_date)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs">
                        <div className="truncate" title={request.reason}>
                          {request.reason || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {request.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleActionClick(request, 'approve')}
                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                                title="Approve"
                              >
                                <i className="fas fa-check"></i>
                              </button>
                              <button
                                onClick={() => handleActionClick(request, 'reject')}
                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                title="Reject"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowActionModal(true);
                              }}
                              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                              title="View Details"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <i className="fas fa-inbox text-5xl text-gray-300 mb-3"></i>
                      <p className="text-gray-500 font-medium">No leave requests found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Action Modal (Approve/Reject) */}
      <AnimatePresence>
        {showActionModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => !submitting && setShowActionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {actionForm.action ? `${actionForm.action.charAt(0).toUpperCase() + actionForm.action.slice(1)} Leave Request` : 'Leave Request Details'}
                  </h2>
                  <button
                    onClick={() => !submitting && setShowActionModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={submitting}
                  >
                    <i className="fas fa-times text-2xl"></i>
                  </button>
                </div>

                {/* Leave Details */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-600">Employee:</span>
                    <span className="text-sm text-gray-900">{selectedRequest.user_name || selectedRequest.employee_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-600">Leave Type:</span>
                    <span>{getLeaveTypeBadge(selectedRequest.leave_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-600">Duration:</span>
                    <span className="text-sm text-gray-900">
                      {formatDate(selectedRequest.start_date)} - {formatDate(selectedRequest.end_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-600">Total Days:</span>
                    <span className="text-sm font-bold text-gray-900">
                      {selectedRequest.days || calculateDays(selectedRequest.start_date, selectedRequest.end_date)} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-600">Status:</span>
                    <span>{getStatusBadge(selectedRequest.status)}</span>
                  </div>
                  {selectedRequest.reason && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-sm font-semibold text-gray-600">Reason:</span>
                      <p className="text-sm text-gray-900 mt-1">{selectedRequest.reason}</p>
                    </div>
                  )}
                  {selectedRequest.remarks && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-sm font-semibold text-gray-600">HR Remarks:</span>
                      <p className="text-sm text-gray-900 mt-1">{selectedRequest.remarks}</p>
                      {selectedRequest.reviewed_by && (
                        <p className="text-xs text-gray-500 mt-1">
                          Reviewed by: {selectedRequest.reviewed_by} on {formatDate(selectedRequest.reviewed_at)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Form - Only for pending requests */}
                {selectedRequest.status === 'pending' && actionForm.action && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Add Remarks {actionForm.action === 'reject' && <span className="text-red-500">*</span>}
                      </label>
                      <textarea
                        value={actionForm.remarks}
                        onChange={(e) => setActionForm({ ...actionForm, remarks: e.target.value })}
                        rows="4"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder={
                          actionForm.action === 'approve'
                            ? 'Add any notes (optional)...'
                            : 'Please provide reason for rejection...'
                        }
                        required={actionForm.action === 'reject'}
                      />
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => !submitting && setShowActionModal(false)}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300"
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmitAction}
                        disabled={submitting || (actionForm.action === 'reject' && !actionForm.remarks)}
                        className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                          actionForm.action === 'approve'
                            ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                            : 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700'
                        }`}
                      >
                        {submitting ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className={`fas fa-${actionForm.action === 'approve' ? 'check' : 'times'} mr-2`}></i>
                            {actionForm.action === 'approve' ? 'Approve' : 'Reject'} Leave
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Leave Balance Modal */}
      <AnimatePresence>
        {showBalanceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => !submitting && setShowBalanceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Update Leave Balance</h2>
                  <button
                    onClick={() => !submitting && setShowBalanceModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    disabled={submitting}
                  >
                    <i className="fas fa-times text-2xl"></i>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Employee <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={balanceForm.employee_id}
                      onChange={(e) => setBalanceForm({ ...balanceForm, employee_id: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    >
                      <option value="">Choose an employee...</option>
                      {employees.map(emp => (
                        <option key={emp.id || emp._id} value={emp.id || emp._id}>
                          {emp.full_name || emp.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Sick Leave Balance
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={balanceForm.sick_leave}
                        onChange={(e) => setBalanceForm({ ...balanceForm, sick_leave: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="e.g., 10"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Casual Leave Balance
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={balanceForm.casual_leave}
                        onChange={(e) => setBalanceForm({ ...balanceForm, casual_leave: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="e.g., 15"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Annual Leave Balance
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={balanceForm.annual_leave}
                        onChange={(e) => setBalanceForm({ ...balanceForm, annual_leave: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="e.g., 20"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={() => !submitting && setShowBalanceModal(false)}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateBalance}
                      disabled={submitting || !balanceForm.employee_id}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2"></i>
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save mr-2"></i>
                          Update Balance
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HRLeaveManagement;
