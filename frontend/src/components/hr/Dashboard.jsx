
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const HRDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalEmployees: 0,
    avgTimeToHire: 0,
    turnoverRate: 0,
    employeeRatings: {
      exceeding: 0,
      meeting: 0,
      needs: 0
    },
    payrollData: {
      salaries: 0,
      taxes: 0,
      benefits: 0
    },
    recentActivities: [],
    pendingApprovals: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('http://localhost:8005/api/hr/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        // Use mock data if API fails
        setDashboardData({
          totalEmployees: 1250,
          avgTimeToHire: 32,
          turnoverRate: 15,
          employeeRatings: {
            exceeding: 30,
            meeting: 50,
            needs: 20
          },
          payrollData: {
            salaries: 1700,
            taxes: 2800,
            benefits: 850
          },
          recentActivities: [
            { time: '10:30 AM', activity: 'John Doe onboarded in Marketing' },
            { time: '9:50 AM', activity: 'New job posting for Senior Developer' },
            { time: '9:30 AM', activity: 'Payroll for Jan completed' }
          ],
          pendingApprovals: [
            { type: 'Leave Requests', count: 5 },
            { type: 'Performance Reviews', count: 3 }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Use mock data on error
      setDashboardData({
        totalEmployees: 1250,
        avgTimeToHire: 32,
        turnoverRate: 15,
        employeeRatings: {
          exceeding: 30,
          meeting: 50,
          needs: 20
        },
        payrollData: {
          salaries: 1700,
          taxes: 2800,
          benefits: 850
        },
        recentActivities: [
          { time: '10:30 AM', activity: 'John Doe onboarded in Marketing' },
          { time: '9:50 AM', activity: 'New job posting for Senior Developer' },
          { time: '9:30 AM', activity: 'Payroll for Jan completed' }
        ],
        pendingApprovals: [
          { type: 'Leave Requests', count: 5 },
          { type: 'Performance Reviews', count: 3 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w bg-white-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HR Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">
                Welcome back! Here's what's happening in HR today.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Employees */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {dashboardData.totalEmployees.toLocaleString()}
                </p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-green-600 font-medium">+25 since last month</span>
                  <i className="fas fa-arrow-up text-green-500 text-xs ml-1"></i>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-blue-600 text-xl"></i>
              </div>
            </div>
          </div>

          {/* Avg. Time to Hire */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Time to Hire</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData.avgTimeToHire} Days</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-600">vs. 45 Days last quarter</span>
                  <i className="fas fa-clock text-gray-400 text-xs ml-1"></i>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-clock text-green-600 text-xl"></i>
              </div>
            </div>
          </div>

          {/* Turnover Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Turnover Rate</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{dashboardData.turnoverRate}%</p>
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-600">vs. Target 10%</span>
                  <i className="fas fa-arrow-down text-red-500 text-xs ml-1"></i>
                </div>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-chart-line text-red-600 text-xl"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Key HR Data Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Monthly Payroll Distribution */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Payroll Distribution</h3>
            
            {/* Payroll Progress Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Salaries</span>
                  <span className="text-sm font-bold text-gray-900">₹{dashboardData.payrollData.salaries}K</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Taxes</span>
                  <span className="text-sm font-bold text-gray-900">₹{dashboardData.payrollData.taxes}K</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-red-500 h-3 rounded-full" style={{ width: '35%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Benefits</span>
                  <span className="text-sm font-bold text-gray-900">₹{dashboardData.payrollData.benefits}K</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Performance Ratings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Employee Performance Ratings</h3>
            
            {/* Performance Chart */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative w-32 h-32">
                <div className="w-full h-full rounded-full border-8 border-blue-200 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">80%</div>
                    <div className="text-sm text-gray-600">Overall Score</div>
                  </div>
                </div>
                <div 
                  className="absolute top-0 left-0 w-full h-full rounded-full border-8 border-blue-600"
                  style={{
                    clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)',
                    transform: 'rotate(0deg)'
                  }}
                ></div>
              </div>
            </div>

            {/* Performance Legend */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">Exceeding</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{dashboardData.employeeRatings.exceeding}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">Meeting</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{dashboardData.employeeRatings.meeting}%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm text-gray-700">Needs Improvement</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{dashboardData.employeeRatings.needs}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Alerts & Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Alerts & Actions</h3>
            
            <div className="space-y-4">
              {dashboardData.pendingApprovals.map((approval, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{approval.type}</p>
                    <p className="text-xs text-gray-600 mt-1">{approval.count} pending items</p>
                  </div>
                  <Link 
                    to={approval.type === 'Leave Requests' ? '/hr-leave-management' : '/hr-performance'}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
                  >
                    Review
                  </Link>
                </div>
              ))}
              
              {dashboardData.pendingApprovals.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-check-circle text-green-500 text-3xl mb-2"></i>
                  <p>All caught up! No pending approvals.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activity Feed</h3>
            
            <div className="space-y-4">
              {dashboardData.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.activity}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
              
              {dashboardData.recentActivities.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-inbox text-gray-400 text-3xl mb-2"></i>
                  <p>No recent activities</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              to="/hr-employees" 
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 transition-colors">
                <i className="fas fa-users text-blue-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-900">Manage Employees</p>
            </Link>

            <Link 
              to="/hr-attendance-dashboard" 
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center group"
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-green-200 transition-colors">
                <i className="fas fa-clock text-green-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-900">Attendance</p>
            </Link>

            <Link 
              to="/hr-payroll" 
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center group"
            >
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-yellow-200 transition-colors">
                <i className="fas fa-calendar text-yellow-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-900">Leaves</p>
            </Link>

            <Link 
              to="/hr-tasks" 
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-center group"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-200 transition-colors">
                <i className="fas fa-tasks text-purple-600 text-xl"></i>
              </div>
              <p className="text-sm font-medium text-gray-900">Task Management</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HRDashboard;