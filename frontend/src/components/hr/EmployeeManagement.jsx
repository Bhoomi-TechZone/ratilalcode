import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = "http://localhost:8005";

// Add Employee Form Component
const AddEmployeeForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '', // Changed from 'role' to match backend
    date_of_joining: new Date().toISOString().split('T')[0], // Changed from 'joinDate'
    address: '',
    salary: '',
    password: '' // Added required password field
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.phone || !formData.position || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);
      
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/leave-requests/add`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success("Employee added successfully!");
          onSuccess();
        } else {
          toast.error(data.message || "Failed to add employee");
        }
      } else if (response.status === 403) {
        toast.error("You don't have permission to add employees");
      } else if (response.status === 401) {
        toast.error("Session expired. Please login again");
        localStorage.removeItem("access_token");
      } else {
        const errorText = await response.text();
        toast.error(`Server error: ${response.status}`);
      }
    } catch (error) {
      console.error("Error adding employee:", error);
      toast.error("Failed to add employee. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Add New Employee</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="Enter full name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="Enter email address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="Enter password for employee login"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="Enter phone number"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Role/Position <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="e.g., Software Developer, HR Manager"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Join Date
            </label>
            <input
              type="date"
              name="date_of_joining"
              value={formData.date_of_joining}
              onChange={handleInputChange}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Salary
            </label>
            <input
              type="text"
              name="salary"
              value={formData.salary}
              onChange={handleInputChange}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="e.g., ₹50,000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Address
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            rows="3"
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="Enter complete address"
          />
        </div>

        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Adding Employee...
              </>
            ) : (
              <>
                <i className="fas fa-plus mr-2"></i>
                Add Employee
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// Edit Employee Form Component
const EditEmployeeForm = ({ employee, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    position: employee?.role || '',
    date_of_joining: employee?.joinDate ? new Date(employee.joinDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    address: employee?.address || '',
    salary: employee?.salary || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic validation
    if (!formData.name || !formData.email || !formData.phone || !formData.position) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const payload = { ...formData };

      const response = await fetch(`${API_BASE_URL}/api/leave-requests/update/${employee.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          toast.success('Employee updated successfully');
          onSuccess();
        } else {
          toast.error(data.message || 'Failed to update employee');
        }
      } else if (response.status === 403) {
        toast.error("You don't have permission to update employees");
      } else if (response.status === 401) {
        toast.error("Session expired. Please login again");
        localStorage.removeItem("access_token");
      } else {
        const text = await response.text();
        toast.error(`Server error: ${response.status}`);
      }
    } catch (err) {
      console.error('Error updating employee:', err);
      toast.error('Failed to update employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-900">Edit Employee</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
            <input name="name" value={formData.name} onChange={handleInputChange} className="w-full px-3 py-2.5 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-3 py-2.5 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
            <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-3 py-2.5 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Position</label>
            <input name="position" value={formData.position} onChange={handleInputChange} className="w-full px-3 py-2.5 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Join Date</label>
            <input type="date" name="date_of_joining" value={formData.date_of_joining} onChange={handleInputChange} className="w-full px-3 py-2.5 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Salary</label>
            <input name="salary" value={formData.salary} onChange={handleInputChange} className="w-full px-3 py-2.5 border rounded" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
          <textarea name="address" value={formData.address} onChange={handleInputChange} rows="3" className="w-full px-3 py-2.5 border rounded" />
        </div>

        <div className="flex gap-3 pt-6 border-t border-slate-200">
          <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded">
            {isSubmitting ? 'Updating...' : 'Update Employee'}
          </button>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-2.5 border rounded">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const EmployeesPage = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [employeesPerPage] = useState(10);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when search changes
      fetchEmployees();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterStatus]);

  // Page change effect
  useEffect(() => {
    fetchEmployees();
  }, [currentPage]);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Authentication required");
        navigate('/login');
        return;
      }

      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: employeesPerPage.toString(),
      });
      
      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      const response = await fetch(`${API_BASE_URL}/api/leave-requests/employees?${params}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        if (data.success) {
          // Filter by status on frontend since backend doesn't support it yet
          let employees = data.data || [];
          if (filterStatus) {
            employees = employees.filter(emp => 
              emp.status.toLowerCase() === filterStatus.toLowerCase()
            );
          }
          
          setEmployees(employees);
          setTotalEmployees(data.total || 0);
          setTotalPages(data.pages || 0);
        } else {
          console.error('API Error:', data.message);
          toast.error(data.message || 'Failed to fetch employees');
          setEmployees([]);
          setTotalEmployees(0);
          setTotalPages(0);
        }
      } else if (response.status === 403) {
        toast.error("You don't have permission to view employees");
        navigate('/dashboard');
        return;
      } else if (response.status === 401) {
        toast.error("Session expired. Please login again");
        localStorage.removeItem("access_token");
        navigate('/login');
        return;
      } else {
        const errorText = await response.text();
        console.error('HTTP Error:', response.status, errorText);
        toast.error(`Server error: ${response.status}`);
        setEmployees([]);
        setTotalEmployees(0);
        setTotalPages(0);
      }
      
    } catch (error) {
      console.error("Error fetching employees:", error);
      
      // Handle different types of errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        toast.error("Network error: Please check your internet connection");
      } else if (error.name === 'SyntaxError') {
        toast.error("Invalid response from server");
      } else {
        toast.error(error.message || "Failed to load employees from server");
      }
      
      // Clear employees on error instead of showing sample data
      setEmployees([]);
      setTotalEmployees(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handleStatusChange = (value) => {
    setFilterStatus(value);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setCurrentPage(1);
  };

  const handleView = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const handleEdit = (employee) => {
    setSelectedEmployee(employee);
    setShowEditModal(true);
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm("Are you sure you want to delete this employee?")) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/leave-requests/delete/${employeeId}`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        toast.success("Employee deleted successfully");
        // Refresh the employee list from server
        fetchEmployees();
      } else {
        throw new Error('Failed to delete employee');
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee");
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      active: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: 'check-circle' },
      inactive: { bg: 'bg-rose-100', text: 'text-rose-800', icon: 'times-circle' },
      pending: { bg: 'bg-amber-100', text: 'text-amber-800', icon: 'hourglass-half' }
    };
    
    const { bg, text, icon } = config[status?.toLowerCase()] || config.active;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        <i className={`fas fa-${icon} mr-1`}></i>
        {status}
      </span>
    );
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 95) return 'text-emerald-600';
    if (percentage >= 90) return 'text-blue-600';
    if (percentage >= 85) return 'text-amber-600';
    return 'text-rose-600';
  };

  // Server-side pagination - use employees directly from API
  const currentEmployees = employees;
  
  // Calculate pagination info for display
  const indexOfLastEmployee = currentPage * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-stone-100 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="bg-white rounded-xl shadow-md p-5 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center text-white shadow-lg">
                <i className="fas fa-users text-2xl"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Employee Management</h1>
                <p className="text-slate-600 text-sm">Manage and track all employees</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow hover:shadow-md flex items-center gap-2 text-sm"
            >
              <i className="fas fa-plus"></i>
              Add Employee
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 font-medium">Total</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{totalEmployees}</p>
            </div>
            <i className="fas fa-users text-2xl text-blue-500"></i>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-700 font-medium">Active</p>
              <p className="text-2xl font-bold text-emerald-900 mt-1">
                {employees.filter(emp => emp.status === 'Active').length}
              </p>
            </div>
            <i className="fas fa-user-check text-2xl text-emerald-500"></i>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 font-medium">Inactive</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">{employees.filter(emp => emp.status === 'Inactive').length}</p>
            </div>
            <i className="fas fa-building text-2xl text-amber-500"></i>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-700 font-medium">Avg Attendance</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {employees.length > 0 ? Math.round(employees.reduce((acc, emp) => acc + (emp.attendance || 0), 0) / employees.length) : 0}%
              </p>
            </div>
            <i className="fas fa-chart-line text-2xl text-purple-500"></i>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-md p-5 border border-slate-200 mb-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Search</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                placeholder="Search by name, email, or ID..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="w-full px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm"
            >
              <i className="fas fa-refresh mr-2"></i>
              Clear Filters
            </button>
          </div>
        </div>
      </motion.div>

      {/* Employees Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Join Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Attendance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Leave Bal.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentEmployees.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <i className="fas fa-users text-4xl text-slate-400 mb-4"></i>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No employees found</h3>
                      <p className="text-slate-500">
                        {searchTerm || filterStatus 
                          ? "Try adjusting your search or filter criteria" 
                          : "No employees available in the system"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : !isLoading ? (
                currentEmployees.map((employee, index) => (
                <motion.tr
                  key={employee.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">{employee.id}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{employee.name}</div>
                        <div className="text-xs text-slate-500">{employee.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900">{employee.role}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900">
                      {new Date(employee.joinDate).toLocaleDateString('en-US', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm font-semibold ${getAttendanceColor(employee.attendance)}`}>
                      {employee.attendance}%
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-900">{employee.leaveBalance}</div>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(employee.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleView(employee)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="View Details"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="Edit Employee"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Employee"
                      >
                        ⚠️
                      </button>
                    </div>
                  </td>
                </motion.tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700">
                Showing {indexOfFirstEmployee + 1} to {Math.min(indexOfLastEmployee, totalEmployees)} of {totalEmployees} employees
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (page === currentPage || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-sm font-medium rounded ${
                          page === currentPage
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2">...</span>;
                  }
                  return null;
                })}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Add Employee Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <AddEmployeeForm 
                onClose={() => setShowAddModal(false)}
                onSuccess={() => {
                  setShowAddModal(false);
                  fetchEmployees(); // Refresh the employee list
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Employee Modal */}
      <AnimatePresence>
        {showViewModal && selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
            onClick={() => setShowViewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Employee Details</h2>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <i className="fas fa-times text-lg"></i>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{selectedEmployee.name}</h3>
                      <p className="text-slate-600">{selectedEmployee.role}</p>
                      {getStatusBadge(selectedEmployee.status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase">Employee ID</label>
                        <p className="text-slate-900 font-medium">{selectedEmployee.id}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase">Email</label>
                        <p className="text-slate-900">{selectedEmployee.email}</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase">Phone</label>
                        <p className="text-slate-900">{selectedEmployee.phone}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase">Join Date</label>
                        <p className="text-slate-900">
                          {new Date(selectedEmployee.joinDate).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase">Attendance</label>
                        <p className={`font-semibold ${getAttendanceColor(selectedEmployee.attendance)}`}>
                          {selectedEmployee.attendance}%
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase">Leave Balance</label>
                        <p className="text-slate-900 font-medium">{selectedEmployee.leaveBalance} days</p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 uppercase">Salary</label>
                        <p className="text-slate-900 font-medium">{selectedEmployee.salary}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase">Address</label>
                    <p className="text-slate-900">{selectedEmployee.address}</p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      handleEdit(selectedEmployee);
                    }}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow"
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Edit Employee
                  </button>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Employee Modal */}
      <AnimatePresence>
        {showEditModal && selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <EditEmployeeForm
                employee={selectedEmployee}
                onClose={() => setShowEditModal(false)}
                onSuccess={() => {
                  setShowEditModal(false);
                  fetchEmployees();
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeesPage;
