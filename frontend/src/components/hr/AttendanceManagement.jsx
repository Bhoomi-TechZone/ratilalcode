import React, { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const API_BASE_URL = "http://localhost:8005";

const HRAttendanceDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allAttendance, setAllAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  
  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showMarkAttendanceModal, setShowMarkAttendanceModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedEmployeeForProfile, setSelectedEmployeeForProfile] = useState(null);
  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [markAttendanceForm, setMarkAttendanceForm] = useState({
    user_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '',
    check_out: '',
    status: 'present',
    notes: ''
  });
  const [viewType, setViewType] = useState('table'); // 'table' or 'analytics'
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState('daily'); // 'daily', 'weekly', 'monthly'
  
  // Stats
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    lateEntries: 0,
    attendancePercentage: 0,
    onLeave: 0,
    halfDay: 0
  });
  // Server-provided attendance summary (from /api/hr/stats)
  const [attendanceSummaryServer, setAttendanceSummaryServer] = useState(null);

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
      fetchAllAttendance(),
      fetchEmployees(),
      fetchLeaveRequests(),
      fetchDashboardStats(),
      fetchAttendanceStats()
    ]);
  };

  // Re-fetch server stats when filters or time range change so cards stay in sync
  useEffect(() => {
    // Only fetch if user is loaded (to ensure token exists)
    if (currentUser) {
      fetchAttendanceStats();
    }
  }, [selectedDepartment, selectedEmployee, startDate, endDate, statusFilter, analyticsTimeRange, currentUser]);

  // Fetch the simple attendance stats endpoint (user-provided /api/hr/stats)
  const fetchAttendanceStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/api/hr/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) return;

      const data = await res.json();

      // Map backend fields to the shape used by the attendance summary cards
      const mapped = {
        present: data.totalPresent ?? data.total_present ?? 0,
        absent: data.totalAbsent ?? data.total_absent ?? 0,
        leave: data.onLeave ?? data.on_leave ?? data.onLeave ?? 0,
        halfDay: data.halfDay ?? data.half_day ?? 0,
        total: data.totalEmployees ?? data.total_employees ?? 0,
        lateEntries: data.lateEntries ?? data.late_entries ?? 0,
        attendancePercentage: data.attendancePercentage ?? data.attendance_percentage ?? 0
      };

      setAttendanceSummaryServer(mapped);
    } catch (err) {
      console.error('Failed to fetch attendance stats:', err);
    }
  };

  // Fetch pre-aggregated dashboard stats from backend if available
  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/api/hr/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const result = await res.json();
        // Backend returns keys like presentToday, absentToday, onLeaveToday, etc.
        // Map them into the local `stats` shape used by UI
        const mapped = {
          totalPresent: result.presentToday ?? result.present_today ?? 0,
          totalAbsent: result.absentToday ?? result.absent_today ?? 0,
          lateEntries: result.lateEntries ?? result.totalLate ?? 0,
          attendancePercentage: result.attendancePercentage ?? result.attendance_rate ?? 0,
          onLeave: result.onLeaveToday ?? result.on_leave_today ?? 0,
          halfDay: result.halfDay ?? 0
        };

        // Only override stats if we have meaningful values
        if (Object.values(mapped).some(v => v !== 0)) {
          setStats(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    }
  };

  // Helper function to parse check-in time for late calculation
  const parseCheckIn = (checkInValue) => {
    if (!checkInValue) return null;
    try {
      // Try to parse as time string first
      if (typeof checkInValue === 'string') {
        // Handle formats like "HH:MM" or "HH:MM:SS"
        const timeMatch = checkInValue.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          return { h: parseInt(timeMatch[1]), m: parseInt(timeMatch[2]) };
        }
        // Handle full datetime string
        const date = new Date(checkInValue);
        if (!isNaN(date.getTime())) {
          return { h: date.getHours(), m: date.getMinutes() };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // Process attendance data to normalize field names
  const processAllAttendance = (attendanceData) => {
    console.log('Raw attendance data:', attendanceData);
    
    return attendanceData.map(record => {
      console.log('Processing record:', record);
      
      // Normalize field names for consistent handling - check ALL possible field names
      const checkInTime = record.check_in || 
                         record.checkin || 
                         record.checkin_time || 
                         record.checkin_display ||
                         record['check-in'] ||
                         record.check_in_time;
                         
      const checkOutTime = record.check_out || 
                          record.checkout || 
                          record.checkout_time || 
                          record.checkout_display ||
                          record['check-out'] ||
                          record.check_out_time;
      
      const processedRecord = {
        ...record,
        // Normalize check-in time field
        check_in: checkInTime,
        // Normalize check-out time field  
        check_out: checkOutTime,
        // Normalize other fields
        employee_id: record.employee_id || record.user_id,
        employee_name: record.employee_name || record.user_name || record.full_name,
        location: record.location || record.location_name
      };
      
      console.log('Processed record with check_in:', processedRecord.check_in, 'type:', typeof processedRecord.check_in);
      
      // Format times if they're datetime objects or ISO strings
      if (processedRecord.check_in) {
        if (typeof processedRecord.check_in === 'string') {
          if (processedRecord.check_in.includes('T') || processedRecord.check_in.includes('Z')) {
            // ISO datetime string
            try {
              const date = new Date(processedRecord.check_in);
              processedRecord.check_in = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              console.log('Formatted check_in time from ISO:', processedRecord.check_in);
            } catch (e) {
              console.error('Error formatting check-in time from ISO:', e);
            }
          } else if (processedRecord.check_in.includes(':')) {
            // Already a time string, keep as is
            console.log('Check-in is already time format:', processedRecord.check_in);
          }
        } else if (processedRecord.check_in instanceof Date) {
          // Date object
          processedRecord.check_in = processedRecord.check_in.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          console.log('Formatted check_in time from Date object:', processedRecord.check_in);
        }
      }
      
      if (processedRecord.check_out) {
        if (typeof processedRecord.check_out === 'string') {
          if (processedRecord.check_out.includes('T') || processedRecord.check_out.includes('Z')) {
            // ISO datetime string
            try {
              const date = new Date(processedRecord.check_out);
              processedRecord.check_out = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              console.log('Formatted check_out time from ISO:', processedRecord.check_out);
            } catch (e) {
              console.error('Error formatting check-out time from ISO:', e);
            }
          } else if (processedRecord.check_out.includes(':')) {
            // Already a time string, keep as is
            console.log('Check-out is already time format:', processedRecord.check_out);
          }
        } else if (processedRecord.check_out instanceof Date) {
          // Date object
          processedRecord.check_out = processedRecord.check_out.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          console.log('Formatted check_out time from Date object:', processedRecord.check_out);
        }
      }
      
      return processedRecord;
    });
  };

  const fetchAllAttendance = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/hr/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Process the attendance data to normalize field names
          const processedData = processAllAttendance(data.data);
          setAllAttendance(processedData);
          calculateStats(processedData);
        }
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance data");
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
        setEmployees(data.employees || data);
        
        // Extract unique departments
        const depts = [...new Set((data.employees || data).map(emp => emp.department).filter(Boolean))];
        setDepartments(depts);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/hr/leave-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data.leave_requests || data);
      }
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    }
  };

  const calculateStats = (attendanceData) => {
    const today = new Date().toISOString().split('T')[0];
    const rows = Array.isArray(attendanceData) ? attendanceData : [];

    // Normalize and pick records whose date is today (robust to iso/timestamp formats)
    const todayRecords = rows.filter((record) => {
      if (!record) return false;
      const recDateRaw = record.date || record.recorded_at || '';
      let recDate = '';
      try {
        if (typeof recDateRaw === 'string' && recDateRaw.includes('T')) {
          recDate = new Date(recDateRaw).toISOString().split('T')[0];
        } else if (typeof recDateRaw === 'string' && recDateRaw.length >= 10) {
          recDate = recDateRaw.slice(0, 10);
        } else if (recDateRaw instanceof Date) {
          recDate = recDateRaw.toISOString().split('T')[0];
        } else {
          recDate = String(recDateRaw);
        }
      } catch (e) {
        recDate = String(recDateRaw);
      }

      return recDate === today;
    });

    // Helpers to normalize status and check-in time
    const normalizeStatus = (s) => (s || '').toString().toLowerCase();

    const parseCheckIn = (checkIn) => {
      if (!checkIn) return null;
      // If it's an ISO string
      if (typeof checkIn === 'string' && checkIn.includes('T')) {
        try {
          const d = new Date(checkIn);
          return { h: d.getHours(), m: d.getMinutes() };
        } catch (e) {
          // fallthrough
        }
      }

      if (typeof checkIn === 'string' && checkIn.split(':').length >= 2) {
        const parts = checkIn.split(':').map(Number);
        return { h: parts[0], m: parts[1] };
      }

      // Not parseable
      return null;
    };

    const present = todayRecords.filter(r => {
      const st = normalizeStatus(r.status);
      return st === 'present' || st === 'p' || st === 'on_duty' || st === 'checked_in';
    }).length;

    const absent = todayRecords.filter(r => {
      const st = normalizeStatus(r.status);
      return st === 'absent' || st === 'a';
    }).length;

    const onLeave = todayRecords.filter(r => normalizeStatus(r.status) === 'leave' || normalizeStatus(r.status) === 'on_leave').length;

    const halfDay = todayRecords.filter(r => normalizeStatus(r.status) === 'half_day' || normalizeStatus(r.status) === 'halfday' || normalizeStatus(r.status) === 'half-day').length;

    // Late entries (check-in after 9:30 AM)
    const late = todayRecords.filter(record => {
      const ci = record.check_in || 
                record.checkin || 
                record.checkin_display || 
                record.check_in_time || 
                record.checkin_time ||
                record['check-in'];
      const parsed = parseCheckIn(ci);
      if (!parsed) return false;
      const { h, m } = parsed;
      if (h > 9) return true;
      if (h === 9 && m > 30) return true;
      return false;
    }).length;

    const total = todayRecords.length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    // Debugging: if counts zero but there are rows, log a sample to help diagnose format issues
    if (total > 0 && present === 0) {
      // console.debug('calculateStats sample todayRecords[0]:', todayRecords[0]);
    }

    setStats({
      totalPresent: present,
      totalAbsent: absent,
      lateEntries: late,
      attendancePercentage: percentage,
      onLeave: onLeave,
      halfDay: halfDay
    });
  };

  // Recalculate stats whenever attendance data or filters change
  useEffect(() => {
    try {
      const filtered = getFilteredAttendance();
      // If there are no filtered records but allAttendance has data, still run calculateStats on filtered to show zeros
      calculateStats(filtered);
    } catch (err) {
      console.error('Error calculating filtered stats:', err);
    }
  }, [allAttendance, selectedDepartment, selectedEmployee, startDate, endDate, statusFilter]);

  const getFilteredAttendance = () => {
    let filtered = [...allAttendance];
    
    if (selectedDepartment !== 'all') {
      const deptEmployees = employees.filter(emp => emp.department === selectedDepartment);
      const deptEmployeeIds = deptEmployees.map(emp => emp.id || emp._id || emp.user_id);
      filtered = filtered.filter(record => deptEmployeeIds.includes(record.user_id));
    }
    
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(record => record.user_id === selectedEmployee);
    }
    
    if (startDate) {
      filtered = filtered.filter(record => record.date >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(record => record.date <= endDate);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }
    
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const handleEditAttendance = (record) => {
    setSelectedRecord(record);
    setEditForm({
      date: record.date,
      check_in: record.check_in || '',
      check_out: record.check_out || '',
      status: record.status,
      working_hours: record.working_hours || '',
      notes: record.notes || ''
    });
    setShowEditModal(true);
  };

  const submitEditAttendance = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/hr/attendance/${selectedRecord._id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        toast.success("Attendance updated successfully");
        setShowEditModal(false);
        fetchAllAttendance();
      } else {
        toast.error("Failed to update attendance");
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
      toast.error("Error updating attendance");
    }
  };

  const handleLeaveAction = async (leaveId, action) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/hr/leave-requests/${leaveId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reviewed_by: currentUser?.full_name || currentUser?.username
        })
      });

      if (response.ok) {
        toast.success(`Leave request ${action}d successfully`);
        fetchLeaveRequests();
        fetchAllAttendance();
      } else {
        toast.error(`Failed to ${action} leave request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing leave:`, error);
      toast.error(`Error ${action}ing leave request`);
    }
  };

  const exportToCSV = () => {
    const filtered = getFilteredAttendance();
    const headers = ['Date', 'Employee', 'Department', 'Check In', 'Check Out', 'Working Hours', 'Status'];
    const csvData = filtered.map(record => [
      record.date,
      record.user_name || 'N/A',
      employees.find(emp => (emp.id || emp._id) === record.user_id)?.department || 'N/A',
      record.check_in || 'N/A',
      record.check_out || 'N/A',
      record.working_hours || 'N/A',
      record.status
    ]);
    
    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast.success("Report exported successfully");
  };

  const handleViewProfile = async (userId) => {
    try {
      const token = localStorage.getItem("access_token");
      
      // Fetch employee details
      const empResponse = await fetch(`${API_BASE_URL}/api/hr/employees/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (empResponse.ok) {
        const empData = await empResponse.json();
        setSelectedEmployeeForProfile(empData.employee || empData);
        
        // Fetch employee's attendance history (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const attendanceHistory = allAttendance.filter(
          record => record.user_id === userId && 
          new Date(record.date) >= thirtyDaysAgo
        ).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Calculate profile stats
        const presentDays = attendanceHistory.filter(r => r.status === 'present').length;
        const absentDays = attendanceHistory.filter(r => r.status === 'absent').length;
        const lateDays = attendanceHistory.filter(r => {
          if (r.check_in) {
            const [hours, minutes] = r.check_in.split(':').map(Number);
            return hours > 9 || (hours === 9 && minutes > 30);
          }
          return false;
        }).length;
        
        const totalWorkingHours = attendanceHistory.reduce((sum, r) => {
          return sum + parseFloat(r.working_hours || 0);
        }, 0);
        
        const avgWorkingHours = attendanceHistory.length > 0 
          ? (totalWorkingHours / attendanceHistory.length).toFixed(1) 
          : 0;
        
        setEmployeeProfile({
          ...empData.employee || empData,
          attendanceHistory,
          stats: {
            presentDays,
            absentDays,
            lateDays,
            totalDays: attendanceHistory.length,
            attendanceRate: attendanceHistory.length > 0 
              ? ((presentDays / attendanceHistory.length) * 100).toFixed(1) 
              : 0,
            avgWorkingHours
          }
        });
        
        setShowProfileModal(true);
      } else {
        toast.error("Failed to fetch employee details");
      }
    } catch (error) {
      console.error("Error fetching employee profile:", error);
      toast.error("Error loading employee profile");
    }
  };

  const handleMarkAttendance = () => {
    setMarkAttendanceForm({
      user_id: '',
      date: new Date().toISOString().split('T')[0],
      check_in: '',
      check_out: '',
      status: 'present',
      notes: 'Manually marked by HR'
    });
    setShowMarkAttendanceModal(true);
  };

  const submitMarkAttendance = async () => {
    if (!markAttendanceForm.user_id) {
      toast.error("Please select an employee");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/api/hr/attendance/manual-checkin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(markAttendanceForm)
       });

      if (response.ok) {
        toast.success("Attendance marked successfully");
        setShowMarkAttendanceModal(false);
        fetchAllAttendance();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || "Failed to mark attendance");
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error("Error marking attendance");
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      present: { bg: 'bg-green-100', text: 'text-green-800', label: 'Present' },
      absent: { bg: 'bg-red-100', text: 'text-red-800', label: 'Absent' },
      half_day: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Half Day' },
      leave: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'On Leave' }
    };
    
    const { bg, text, label } = config[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
        {label}
      </span>
    );
  };

  // Get alerts for continuous absences or late check-ins
  const getAlerts = () => {
    const alerts = [];
    
    // Check for continuous absences (3+ consecutive days)
    const employeeAbsences = {};
    allAttendance.forEach(record => {
      if (record.status === 'absent') {
        if (!employeeAbsences[record.user_id]) {
          employeeAbsences[record.user_id] = [];
        }
        employeeAbsences[record.user_id].push(record.date);
      }
    });
    
    Object.entries(employeeAbsences).forEach(([userId, dates]) => {
      dates.sort();
      let consecutive = 1;
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const diff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (diff === 1) {
          consecutive++;
          if (consecutive >= 3) {
            const employee = employees.find(emp => (emp.id || emp._id) === userId);
            alerts.push({
              type: 'danger',
              message: `${employee?.full_name || 'Employee'} has ${consecutive} consecutive absences`,
              icon: 'exclamation-triangle'
            });
            break;
          }
        } else {
          consecutive = 1;
        }
      }
    });
    
    // Check for frequent late check-ins (5+ in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const employeeLateEntries = {};
    allAttendance.forEach(record => {
      if (new Date(record.date) >= thirtyDaysAgo && record.check_in) {
        const [hours, minutes] = record.check_in.split(':').map(Number);
        if (hours > 9 || (hours === 9 && minutes > 30)) {
          employeeLateEntries[record.user_id] = (employeeLateEntries[record.user_id] || 0) + 1;
        }
      }
    });
    
    Object.entries(employeeLateEntries).forEach(([userId, count]) => {
      if (count >= 5) {
        const employee = employees.find(emp => (emp.id || emp._id) === userId);
        alerts.push({
          type: 'warning',
          message: `${employee?.full_name || 'Employee'} has ${count} late check-ins in the last 30 days`,
          icon: 'clock'
        });
      }
    });
    
    return alerts;
  };

  // Analytics Functions
  const getAttendanceByTimeRange = () => {
    const now = new Date();
    let startDate;
    
    switch(analyticsTimeRange) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'monthly':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 7));
    }
    
    return allAttendance.filter(record => new Date(record.date) >= startDate);
  };

  const getAttendanceSummary = () => {
    const records = getAttendanceByTimeRange();
    
    return {
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      leave: records.filter(r => r.status === 'leave').length,
      halfDay: records.filter(r => r.status === 'half_day').length,
      total: records.length
    };
  };

  const getDepartmentWiseAttendance = () => {
    const deptData = {};
    
    departments.forEach(dept => {
      const deptEmployees = employees.filter(emp => emp.department === dept);
      const deptEmployeeIds = deptEmployees.map(emp => emp.id || emp._id || emp.user_id);
      const deptRecords = getAttendanceByTimeRange().filter(record => 
        deptEmployeeIds.includes(record.user_id)
      );
      
      deptData[dept] = {
        present: deptRecords.filter(r => r.status === 'present').length,
        absent: deptRecords.filter(r => r.status === 'absent').length,
        leave: deptRecords.filter(r => r.status === 'leave').length,
        total: deptRecords.length
      };
    });
    
    return deptData;
  };

  const getLateArrivalsTrend = () => {
    const records = getAttendanceByTimeRange();
    const lateByDate = {};
    
    records.forEach(record => {
      if (record.check_in) {
        const [hours, minutes] = record.check_in.split(':').map(Number);
        if (hours > 9 || (hours === 9 && minutes > 30)) {
          lateByDate[record.date] = (lateByDate[record.date] || 0) + 1;
        }
      }
    });
    
    return Object.entries(lateByDate)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-7); // Last 7 days
  };

  const getEarlyLeavesTrend = () => {
    const records = getAttendanceByTimeRange();
    const earlyByDate = {};
    
    records.forEach(record => {
      if (record.check_out) {
        const [hours, minutes] = record.check_out.split(':').map(Number);
        if (hours < 17 || (hours === 17 && minutes < 30)) {
          earlyByDate[record.date] = (earlyByDate[record.date] || 0) + 1;
        }
      }
    });
    
    return Object.entries(earlyByDate)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .slice(-7); // Last 7 days
  };

  const getTopPunctualEmployees = () => {
    const employeeScores = {};
    const records = getAttendanceByTimeRange();
    
    records.forEach(record => {
      if (!employeeScores[record.user_id]) {
        employeeScores[record.user_id] = {
          name: record.user_name,
          onTime: 0,
          total: 0
        };
      }
      
      employeeScores[record.user_id].total++;
      
      if (record.check_in) {
        const [hours, minutes] = record.check_in.split(':').map(Number);
        if (hours < 9 || (hours === 9 && minutes <= 30)) {
          employeeScores[record.user_id].onTime++;
        }
      }
    });
    
    return Object.entries(employeeScores)
      .map(([userId, data]) => ({
        userId,
        name: data.name || employees.find(e => (e.id || e._id) === userId)?.full_name || 'Unknown',
        onTimePercentage: ((data.onTime / data.total) * 100).toFixed(1),
        onTime: data.onTime,
        total: data.total
      }))
      .filter(emp => emp.total >= 5) // At least 5 days
      .sort((a, b) => b.onTimePercentage - a.onTimePercentage)
      .slice(0, 5); // Top 5
  };

  const getFrequentAbsentees = () => {
    const employeeAbsences = {};
    const records = getAttendanceByTimeRange();
    
    records.forEach(record => {
      if (record.status === 'absent') {
        if (!employeeAbsences[record.user_id]) {
          employeeAbsences[record.user_id] = {
            name: record.user_name,
            absences: 0,
            total: 0
          };
        }
        employeeAbsences[record.user_id].absences++;
      }
      
      if (employeeAbsences[record.user_id]) {
        employeeAbsences[record.user_id].total++;
      }
    });
    
    return Object.entries(employeeAbsences)
      .map(([userId, data]) => ({
        userId,
        name: data.name || employees.find(e => (e.id || e._id) === userId)?.full_name || 'Unknown',
        absences: data.absences,
        absenceRate: ((data.absences / data.total) * 100).toFixed(1)
      }))
      .filter(emp => emp.absences >= 2) // At least 2 absences
      .sort((a, b) => b.absences - a.absences)
      .slice(0, 5); // Top 5
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const filteredAttendance = getFilteredAttendance();
  const alerts = getAlerts();
  // Prefer server-provided summary when available, otherwise compute from client data
  const attendanceSummary = attendanceSummaryServer || getAttendanceSummary();
  const deptWiseData = getDepartmentWiseAttendance();
  const lateArrivalsTrend = getLateArrivalsTrend();
  const earlyLeavesTrend = getEarlyLeavesTrend();
  const topPunctual = getTopPunctualEmployees();
  const frequentAbsentees = getFrequentAbsentees();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <i className="fas fa-users-cog text-indigo-600 mr-3"></i>
                HR Attendance Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Manage and monitor employee attendance</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleMarkAttendance}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <i className="fas fa-calendar-plus"></i>
                Mark Attendance
              </button>
              <button
                onClick={exportToCSV}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <i className="fas fa-file-export"></i>
                Export Report
              </button>
            </div>
          </div>

          {/* View Toggle Buttons */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setViewType('table')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                viewType === 'table'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fas fa-table"></i>
              Table View
            </button>
            <button
              onClick={() => setViewType('analytics')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                viewType === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <i className="fas fa-chart-bar"></i>
              Analytics & Reports
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 font-medium">Present Today</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{stats.totalPresent}</p>
                </div>
                <i className="fas fa-user-check text-3xl text-green-500"></i>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700 font-medium">Absent Today</p>
                  <p className="text-2xl font-bold text-red-900 mt-1">{stats.totalAbsent}</p>
                </div>
                <i className="fas fa-user-times text-3xl text-red-500"></i>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">Late Entries</p>
                  <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.lateEntries}</p>
                </div>
                <i className="fas fa-clock text-3xl text-yellow-500"></i>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 font-medium">On Leave</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{stats.onLeave}</p>
                </div>
                <i className="fas fa-calendar-check text-3xl text-green-500"></i>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 font-medium">Half Day</p>
                  <p className="text-2xl font-bold text-orange-900 mt-1">{stats.halfDay}</p>
                </div>
                <i className="fas fa-user-clock text-3xl text-orange-500"></i>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-700 font-medium">Attendance %</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">{stats.attendancePercentage}%</p>
                </div>
                <i className="fas fa-chart-pie text-3xl text-indigo-500"></i>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alerts Section */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 space-y-3"
          >
            {alerts.map((alert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-l-4 flex items-start gap-3 ${
                  alert.type === 'warning' 
                    ? 'bg-yellow-50 border-yellow-500' 
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <i className={`fas fa-${alert.icon} text-xl ${
                  alert.type === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`}></i>
                <div className="flex-1">
                  <p className={`font-semibold ${
                    alert.type === 'warning' ? 'text-yellow-800' : 'text-red-800'
                  }`}>
                    {alert.type === 'warning' ? 'Warning' : 'Alert'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    alert.type === 'warning' ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {alert.message}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {viewType === 'analytics' ? (
        /* Analytics & Reports View */
        <>
          {/* Time Range Selector */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-calendar-alt text-indigo-600 mr-2"></i>
              Time Range
            </h2>
            <div className="flex gap-2">
              {['daily', 'weekly', 'monthly'].map(range => (
                <button
                  key={range}
                  onClick={() => setAnalyticsTimeRange(range)}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all duration-200 capitalize ${
                    analyticsTimeRange === range
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Attendance Summary Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-chart-pie text-indigo-600 mr-2"></i>
              Attendance Summary ({analyticsTimeRange})
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <i className="fas fa-user-check text-3xl text-green-500"></i>
                  <span className="text-2xl font-bold text-green-900">{attendanceSummary.present}</span>
                </div>
                <p className="text-sm font-medium text-green-700">Total Present</p>
                <p className="text-xs text-green-600 mt-1">
                  {attendanceSummary.total > 0 ? ((attendanceSummary.present / attendanceSummary.total) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
                <div className="flex items-center justify-between mb-2">
                  <i className="fas fa-user-times text-3xl text-red-500"></i>
                  <span className="text-2xl font-bold text-red-900">{attendanceSummary.absent}</span>
                </div>
                <p className="text-sm font-medium text-red-700">Total Absent</p>
                <p className="text-xs text-red-600 mt-1">
                  {attendanceSummary.total > 0 ? ((attendanceSummary.absent / attendanceSummary.total) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <i className="fas fa-calendar-check text-3xl text-green-500ext-3xl text-blue-500"></i>
                  <span className="text-2xl font-bold text-blue-900">{attendanceSummary.leave}</span>
                </div>
                <p className="text-sm font-medium text-blue-700">On Leave</p>
                <p className="text-xs text-blue-600 mt-1">
                  {attendanceSummary.total > 0 ? ((attendanceSummary.leave / attendanceSummary.total) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <i className="fas fa-user-clock text-3xl text-yellow-500"></i>
                  <span className="text-2xl font-bold text-yellow-900">{attendanceSummary.halfDay}</span>
                </div>
                <p className="text-sm font-medium text-yellow-700">Half Day</p>
                <p className="text-xs text-yellow-600 mt-1">
                  {attendanceSummary.total > 0 ? ((attendanceSummary.halfDay / attendanceSummary.total) * 100).toFixed(1) : 0}% of total
                </p>
              </div>
            </div>
            
            {/* Visual Bar Chart */}
            <div className="mt-6">
              <div className="flex items-center gap-2 h-8 rounded-lg overflow-hidden">
                <div 
                  className="bg-green-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${attendanceSummary.total > 0 ? (attendanceSummary.present / attendanceSummary.total) * 100 : 0}%` }}
                >
                  {attendanceSummary.present > 0 && `${attendanceSummary.present}`}
                </div>
                <div 
                  className="bg-red-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${attendanceSummary.total > 0 ? (attendanceSummary.absent / attendanceSummary.total) * 100 : 0}%` }}
                >
                  {attendanceSummary.absent > 0 && `${attendanceSummary.absent}`}
                </div>
                <div 
                  className="bg-blue-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${attendanceSummary.total > 0 ? (attendanceSummary.leave / attendanceSummary.total) * 100 : 0}%` }}
                >
                  {attendanceSummary.leave > 0 && `${attendanceSummary.leave}`}
                </div>
                <div 
                  className="bg-yellow-500 h-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${attendanceSummary.total > 0 ? (attendanceSummary.halfDay / attendanceSummary.total) * 100 : 0}%` }}
                >
                  {attendanceSummary.halfDay > 0 && `${attendanceSummary.halfDay}`}
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>Total Records: {attendanceSummary.total}</span>
              </div>
            </div>
          </motion.div>

          {/* Department-wise Attendance */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <i className="fas fa-building text-indigo-600 mr-2"></i>
              Department-wise Attendance
            </h2>
            
            <div className="space-y-4">
              {Object.entries(deptWiseData).map(([dept, data], index) => (
                <div key={dept} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{dept}</h3>
                    <span className="text-sm text-gray-600">Total: {data.total}</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{data.present}</p>
                      <p className="text-xs text-gray-600">Present</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{data.absent}</p>
                      <p className="text-xs text-gray-600">Absent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{data.leave}</p>
                      <p className="text-xs text-gray-600">Leave</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 h-4 rounded overflow-hidden">
                    <div 
                      className="bg-green-400 h-full"
                      style={{ width: `${data.total > 0 ? (data.present / data.total) * 100 : 0}%` }}
                    />
                    <div 
                      className="bg-red-400 h-full"
                      style={{ width: `${data.total > 0 ? (data.absent / data.total) * 100 : 0}%` }}
                    />
                    <div 
                      className="bg-blue-400 h-full"
                      style={{ width: `${data.total > 0 ? (data.leave / data.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Late Arrivals Trend */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <i className="fas fa-clock text-yellow-600 mr-2"></i>
                Late Arrivals Trend (Last 7 Days)
              </h2>
              
              <div className="space-y-3">
                {lateArrivalsTrend.length > 0 ? (
                  lateArrivalsTrend.map(([date, count]) => (
                    <div key={date} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-24">{formatDate(date)}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                        <div 
                          className="bg-yellow-500 h-full flex items-center justify-end pr-3 text-white text-sm font-semibold transition-all duration-500"
                          style={{ width: `${Math.min((count / Math.max(...lateArrivalsTrend.map(d => d[1]))) * 100, 100)}%` }}
                        >
                          {count}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No late arrivals in this period</p>
                )}
              </div>
            </motion.div>

            {/* Early Leaves Trend */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <i className="fas fa-sign-out-alt text-orange-600 mr-2"></i>
                Early Leaves Trend (Last 7 Days)
              </h2>
              
              <div className="space-y-3">
                {earlyLeavesTrend.length > 0 ? (
                  earlyLeavesTrend.map(([date, count]) => (
                    <div key={date} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-24">{formatDate(date)}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                        <div 
                          className="bg-orange-500 h-full flex items-center justify-end pr-3 text-white text-sm font-semibold transition-all duration-500"
                          style={{ width: `${Math.min((count / Math.max(...earlyLeavesTrend.map(d => d[1]))) * 100, 100)}%` }}
                        >
                          {count}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No early leaves in this period</p>
                )}
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Punctual Employees */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <i className="fas fa-trophy text-yellow-500 mr-2"></i>
                Top Punctual Employees
              </h2>
              
              <div className="space-y-3">
                {topPunctual.length > 0 ? (
                  topPunctual.map((employee, index) => (
                    <div key={employee.userId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                        {employee.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-600">{employee.onTime} on-time / {employee.total} days</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">{employee.onTimePercentage}%</p>
                        <p className="text-xs text-gray-500">On-time</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No data available</p>
                )}
              </div>
            </motion.div>

            {/* Frequent Absentees */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <i className="fas fa-exclamation-triangle text-red-600 mr-2"></i>
                Employees with Frequent Absences
              </h2>
              
              <div className="space-y-3">
                {frequentAbsentees.length > 0 ? (
                  frequentAbsentees.map((employee, index) => (
                    <div key={employee.userId} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center text-red-600 font-semibold">
                        {employee.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-600">{employee.absences} absences</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">{employee.absenceRate}%</p>
                        <p className="text-xs text-gray-500">Absence Rate</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No frequent absences found</p>
                )}
              </div>
            </motion.div>
          </div>
        </>
      ) : (
        <>
      {/* Filters Section */}
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id || emp._id} value={emp.id || emp._id}>
                  {emp.full_name || emp.username}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="half_day">Half Day</option>
              <option value="leave">On Leave</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setSelectedDepartment('all');
              setSelectedEmployee('all');
              setStartDate('');
              setEndDate('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            <i className="fas fa-redo mr-2"></i>
            Reset Filters
          </button>
        </div>
      </motion.div>

      {/* Attendance Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-lg overflow-hidden"
      >
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center justify-between">
            <span>
              <i className="fas fa-table text-indigo-600 mr-2"></i>
              Attendance Records ({filteredAttendance.length})
            </span>
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Check In</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Check Out</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Working Hours</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAttendance.length > 0 ? (
                  filteredAttendance.map((record, index) => {
                    const employee = employees.find(emp => (emp.id || emp._id || emp.user_id) === record.user_id);
                    return (
                      <motion.tr
                        key={record._id || index}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.02 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDate(record.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold text-sm mr-2">
                              {(record.employee_name || employee?.full_name || employee?.username || 'U').charAt(0)}
                            </div>
                            <span className="text-sm text-gray-900">
                              {record.employee_name || record.user_name || employee?.full_name || employee?.username || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {employee?.department || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatTime(record.check_in)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatTime(record.check_out)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.working_hours ? `${record.working_hours} hrs` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(record.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewProfile(record.user_id)}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                              title="View Profile"
                            >
                              <i className="fas fa-user"></i>
                            </button>
                            <button
                              onClick={() => handleEditAttendance(record)}
                              className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                              title="Edit Attendance"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <i className="fas fa-inbox text-5xl text-gray-300 mb-3"></i>
                      <p className="text-gray-500 font-medium">No attendance records found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Leave Requests Section */}
      {leaveRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-6 mt-6"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <i className="fas fa-clipboard-list text-indigo-600 mr-2"></i>
            Pending Leave Requests ({leaveRequests.filter(r => r.status === 'pending').length})
          </h2>
          
          <div className="space-y-3">
            {leaveRequests.filter(r => r.status === 'pending').map((leave, index) => (
              <motion.div
                key={leave._id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                        {(leave.user_name || 'U').charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{leave.user_name || 'Employee'}</p>
                        <p className="text-sm text-gray-500">{leave.leave_type || 'Leave Request'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <i className="fas fa-calendar mr-2 text-gray-400"></i>
                        {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </div>
                      <div>
                        <i className="fas fa-clock mr-2 text-gray-400"></i>
                        {leave.days || 0} days
                      </div>
                    </div>
                    {leave.reason && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        <i className="fas fa-comment-alt mr-2 text-gray-400"></i>
                        {leave.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLeaveAction(leave._id, 'approve')}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                    >
                      <i className="fas fa-check mr-1"></i>
                      Approve
                    </button>
                    <button
                      onClick={() => handleLeaveAction(leave._id, 'reject')}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                    >
                      <i className="fas fa-times mr-1"></i>
                      Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Edit Attendance Modal */}
      <AnimatePresence>
        {showEditModal && selectedRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal(false)}
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
                  <h2 className="text-2xl font-bold text-gray-900">Edit Attendance</h2>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i className="fas fa-times text-2xl"></i>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Check In Time</label>
                      <input
                        type="time"
                        value={editForm.check_in}
                        onChange={(e) => setEditForm({ ...editForm, check_in: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Check Out Time</label>
                      <input
                        type="time"
                        value={editForm.check_out}
                        onChange={(e) => setEditForm({ ...editForm, check_out: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half Day</option>
                        <option value="leave">On Leave</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Working Hours</label>
                      <input
                        type="number"
                        step="0.1"
                        value={editForm.working_hours}
                        onChange={(e) => setEditForm({ ...editForm, working_hours: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        placeholder="e.g., 8.5"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      placeholder="Add any notes or remarks..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitEditAttendance}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <i className="fas fa-save mr-2"></i>
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mark Attendance Modal */}
      <AnimatePresence>
        {showMarkAttendanceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowMarkAttendanceModal(false)}
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
                  <h2 className="text-2xl font-bold text-gray-900">Mark Attendance Manually</h2>
                  <button
                    onClick={() => setShowMarkAttendanceModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
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
                      value={markAttendanceForm.user_id}
                      onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, user_id: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    >
                      <option value="">Choose an employee...</option>
                      {employees.map(emp => (
                        <option key={emp.id || emp._id} value={emp.id || emp._id || emp.user_id}>
                          {emp.full_name || emp.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={markAttendanceForm.date}
                        onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, date: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                      <select
                        value={markAttendanceForm.status}
                        onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, status: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="half_day">Half Day</option>
                        <option value="leave">On Leave</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Check In</label>
                      <input
                        type="time"
                        value={markAttendanceForm.check_in}
                        onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, check_in: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Check Out</label>
                      <input
                        type="time"
                        value={markAttendanceForm.check_out}
                        onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, check_out: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                    <textarea
                      value={markAttendanceForm.notes}
                      onChange={(e) => setMarkAttendanceForm({ ...markAttendanceForm, notes: e.target.value })}
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      placeholder="Add notes (e.g., Manually marked by HR)..."
                    />
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={() => setShowMarkAttendanceModal(false)}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitMarkAttendance}
                      disabled={!markAttendanceForm.user_id}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fas fa-check mr-2"></i>
                      Mark Attendance
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee Profile Modal */}
      <AnimatePresence>
        {showProfileModal && employeeProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowProfileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 sm:p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                      {(employeeProfile.full_name || employeeProfile.username || 'U').charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{employeeProfile.full_name || employeeProfile.username}</h2>
                      <p className="text-gray-600">{employeeProfile.department || 'Department'} • {employeeProfile.position || 'Position'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <i className="fas fa-times text-2xl"></i>
                  </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <i className="fas fa-check-circle text-2xl text-green-500"></i>
                      <span className="text-2xl font-bold text-green-900">{employeeProfile.stats.presentDays}</span>
                    </div>
                    <p className="text-sm font-medium text-green-700">Present Days</p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center justify-between mb-2">
                      <i className="fas fa-times-circle text-2xl text-red-500"></i>
                      <span className="text-2xl font-bold text-red-900">{employeeProfile.stats.absentDays}</span>
                    </div>
                    <p className="text-sm font-medium text-red-700">Absent Days</p>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <i className="fas fa-clock text-2xl text-yellow-500"></i>
                      <span className="text-2xl font-bold text-yellow-900">{employeeProfile.stats.lateDays}</span>
                    </div>
                    <p className="text-sm font-medium text-yellow-700">Late Arrivals</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <i className="fas fa-percentage text-2xl text-indigo-500"></i>
                      <span className="text-2xl font-bold text-indigo-900">{employeeProfile.stats.attendanceRate}%</span>
                    </div>
                    <p className="text-sm font-medium text-indigo-700">Attendance Rate</p>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Days (Last 30)</p>
                    <p className="text-lg font-bold text-gray-900">{employeeProfile.stats.totalDays}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg. Working Hours</p>
                    <p className="text-lg font-bold text-gray-900">{employeeProfile.stats.avgWorkingHours} hrs</p>
                  </div>
                </div>

                {/* Attendance History */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <i className="fas fa-history text-indigo-600 mr-2"></i>
                    Recent Attendance History (Last 30 Days)
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Check In</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Check Out</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Hours</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {employeeProfile.attendanceHistory.slice(0, 10).map((record, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{formatDate(record.date)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatTime(record.check_in)}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{formatTime(record.check_out)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {record.working_hours ? `${record.working_hours} hrs` : 'N/A'}
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all duration-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
};

export default HRAttendanceDashboard;
