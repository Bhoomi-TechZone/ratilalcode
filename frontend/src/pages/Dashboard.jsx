// import React, { useState, useEffect, useRef } from 'react';
// import Chart from 'chart.js/auto';
// import QuotationsPage from './QuotationsPage';
// import FranchiseManagement from './FranchiseManagement';
// import SupportTicketSystem from './SupportTicketSystem';
// import LeaveRequestCard from './LeaveRequestCard';
// import FranchiseCard from './FranchiseCard';
// import EnquiryTracking from './EnquiryTracking';
// import AllLeadsTable from '../components/leads/AllLeadsTable';
// import { useNavigate } from 'react-router-dom';

// // ErrorBoundary component for better error handling
// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false, error: null, errorInfo: null };
//   }
//   static getDerivedStateFromError(error) {
//     return { hasError: true, error };
//   }
//   componentDidCatch(error, errorInfo) {
//     this.setState({ errorInfo });
//     // Log error if needed
//     // console.error("ErrorBoundary caught error", error, errorInfo);
//   }
//   render() {
//     if (this.state.hasError) {
//       return (
//         <div style={{
//           background: '#fee',
//           color: '#a00',
//           padding: 24,
//           borderRadius: 8,
//           margin: 24,
//           border: '1px solid #a00'
//         }}>
//           <h2>Something went wrong in the Dashboard.</h2>
//           <details style={{ whiteSpace: 'pre-wrap' }}>
//             {this.state.error && this.state.error.toString()}
//             <br />
//             {this.state.errorInfo && this.state.errorInfo.componentStack}
//           </details>
//           <p>
//             Please reload the page or contact support.<br />
//             <a href="https://react.dev/link/error-boundaries" target="_blank" rel="noopener noreferrer">Learn more about error boundaries</a>
//           </p>
//         </div>
//       );
//     }
//     return this.props.children;
//   }
// }

// const CARDS_PER_PAGE = 5;

// const Dashboard = () => {
//   const [activeTab, setActiveTab] = useState(null);
//   const [showAllLeads, setShowAllLeads] = useState(false);
//   const [leads, setLeads] = useState([]);
//   const [loadingLeads, setLoadingLeads] = useState(true);
//   const [leadsError, setLeadsError] = useState("");
//   const [selectedLead, setSelectedLead] = useState(null);
//   const [leadPage, setLeadPage] = useState(0);

//   const [totalRevenue, setTotalRevenue] = useState(null);
//   const [totalLeads, setTotalLeads] = useState(null);
//   const [convertedLeads, setConvertedLeads] = useState(null);
//   const [openTickets, setOpenTickets] = useState(null);

//   const [activeSection, setActiveSection] = useState(null);

//   const [monthlyRevenue, setMonthlyRevenue] = useState([]);
//   const [monthlyExpenses, setMonthlyExpenses] = useState([]);
//   const [monthlyLeads, setMonthlyLeads] = useState([]);
//   const [monthlyConversions, setMonthlyConversions] = useState([]);
//   const [monthlyTickets, setMonthlyTickets] = useState([]);
//   const [chartLabels, setChartLabels] = useState([]);
//   // Removed franchise chart related states and refs
//   const [enquiries, setEnquiries] = useState([]);
//   const [franchiseEnquiryCounts, setFranchiseEnquiryCounts] = useState({});
//   const [showImportModal, setShowImportModal] = useState(false);

//   //27/06
//   const navigate = useNavigate();

//   // Fetch statistics, franchise counts, leads, approvals, etc.
//   useEffect(() => {
//     const token = localStorage.getItem('access_token') || '';
//     const headers = {
//       'Authorization': `Bearer ${token}`
//     };

//     fetch('http://localhost:3005/api/quotations', { headers })
//       .then(res => res.json())
//       .then(data => {
//         if (data.summary && typeof data.summary.total_amount === 'number') {
//           setTotalRevenue(data.summary.total_amount);
//         }
//       });

//     fetch('http://localhost:3005/api/lead/leads', { headers })
//       .then(res => res.json())
//       .then(data => {
//         if (typeof data.total === 'number') {
//           setTotalLeads(data.total);
//         }
//       });

//     fetch('http://localhost:3005/api/lead/leads?status=converted', { headers })
//       .then(res => res.json())
//       .then(data => {
//         if (typeof data.total === 'number') {
//           setConvertedLeads(data.total);
//         }
//       });

//     fetch('http://localhost:3005/api/tickets/?status=open', { headers })
//       .then(res => res.json())
//       .then(data => {
//         if (Array.isArray(data)) setOpenTickets(data.length);
//       });
//   }, []);

//   // Monthly charts - Last 6 months only
//   useEffect(() => {
//     const now = new Date();
//     const year = now.getFullYear();
//     const currentMonth = now.getMonth() + 1;
//     const token = localStorage.getItem('access_token') || '';
//     const headers = {
//       'Authorization': `Bearer ${token}`
//     };

//     // Get last 6 months
//     const months = [];
//     const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

//     for (let i = 5; i >= 0; i--) {
//       const date = new Date(year, currentMonth - 1 - i, 1);
//       const monthNumber = date.getMonth() + 1;
//       const monthYear = date.getFullYear();
//       const monthName = monthNames[date.getMonth()];

//       months.push({
//         number: monthNumber,
//         year: monthYear,
//         name: monthName,
//         label: monthYear === now.getFullYear() ? monthName : `${monthName} '${monthYear.toString().slice(-2)}`
//       });
//     }

//     const labels = months.map(m => m.label);
//     setChartLabels(labels);

//     // Removed franchise chart data fetching

//     Promise.all(
//       months.map(month =>
//         fetch(`http://localhost:3005/app/payments/monthly_report?dealer_id=ALL&year=${month.year}&month=${month.number}`, { headers })
//           .then(res => res.json())
//           .catch(() => ({ total_payments: 0, total_expenses: 0 }))
//       )
//     ).then(dataArr => {
//       setMonthlyRevenue(dataArr.map(d => d.total_payments || 0));
//       setMonthlyExpenses(dataArr.map(d => d.total_expenses || 0));
//     });

//     // Fetch leads data for last 6 months
//     Promise.all(
//       months.map(month =>
//         fetch(`http://localhost:3005/api/lead/leads?page=1&limit=1&start_date=${month.year}-${month.number.toString().padStart(2, '0')}-01&end_date=${month.year}-${month.number.toString().padStart(2, '0')}-31`, { headers })
//           .then(res => res.json())
//           .then(data => data.total || 0)
//           .catch(() => 0)
//       )
//     ).then(setMonthlyLeads);

//     // Fetch converted leads data for last 6 months
//     Promise.all(
//       months.map(month =>
//         fetch(`http://localhost:3005/api/lead/leads?page=1&limit=1&start_date=${month.year}-${month.number.toString().padStart(2, '0')}-01&end_date=${month.year}-${month.number.toString().padStart(2, '0')}-31&status=converted`, { headers })
//           .then(res => res.json())
//           .then(data => data.total || 0)
//           .catch(() => 0)
//       )
//     ).then(setMonthlyConversions);

//     Promise.all(
//       months.map(month =>
//         fetch(`http://localhost:3005/api/tickets/?status=open&month=${month.number}&year=${month.year}`, { headers })
//           .then(res => res.json())
//           .then(data => Array.isArray(data) ? data.length : 0)
//           .catch(() => 0)
//       )
//     ).then(setMonthlyTickets);
//   }, []);


//   useEffect(() => {
//     const token = localStorage.getItem('access_token') || '';
//     const headers = {
//       'Authorization': `Bearer ${token}`
//     };
    
//     fetch('http://localhost:3005/api/franchises/enquiries', { headers })
//       .then(res => res.json())
//       .then(data => {
//         setEnquiries(data);
//         setFranchiseEnquiryCounts(getStatusCounts(data));
//       });
//   }, []);

//   // Franchise/Expense Chart - REMOVED
//   // useEffect(() => {
//   //   if (!chartLabels.length || !monthlyFranchise.length || !monthlyExpenses.length) return;
//   //   // Franchise Applications Chart - REMOVED
//   //   // Expenses Chart - REMOVED
//   // }, [chartLabels, monthlyFranchise, monthlyExpenses]);

//   // Leads Chart
//   useEffect(() => {
//     const ctx = document.getElementById('leadsChart');
//     if (
//       ctx &&
//       Array.isArray(monthlyLeads) &&
//       Array.isArray(monthlyConversions) &&
//       Array.isArray(chartLabels) &&
//       monthlyLeads.length === chartLabels.length &&
//       monthlyConversions.length === chartLabels.length &&
//       chartLabels.length > 0
//     ) {
//       if (ctx._chart) ctx._chart.destroy();
//       ctx._chart = new Chart(ctx, {
//         type: 'line',
//         data: {
//           labels: chartLabels,
//           datasets: [
//             {
//               label: 'Total Leads',
//               data: monthlyLeads,
//               backgroundColor: 'rgba(59, 130, 246, 0.2)',
//               borderColor: '#3B82F6',
//               borderWidth: 2,
//               fill: true,
//               tension: 0.4,
//               pointRadius: 5,
//               pointHoverRadius: 8,
//               pointBackgroundColor: '#3B82F6',
//               pointBorderColor: '#ffffff',
//               pointBorderWidth: 2,
//             },
//             {
//               label: 'Converted Leads',
//               data: monthlyConversions,
//               backgroundColor: 'rgba(16, 185, 129, 0.2)',
//               borderColor: '#10B981',
//               borderWidth: 2,
//               fill: true,
//               tension: 0.4,
//               pointRadius: 5,
//               pointHoverRadius: 8,
//               pointBackgroundColor: '#10B981',
//               pointBorderColor: '#ffffff',
//               pointBorderWidth: 2,
//             },
//           ],
//         },
//         options: {
//           responsive: true,
//           maintainAspectRatio: false,
//           plugins: {
//             legend: {
//               position: 'top',
//               labels: {
//                 font: {
//                   size: 14,
//                 },
//                 usePointStyle: true,
//                 padding: 20,
//               },
//             },
//             tooltip: {
//               mode: 'index',
//               intersect: false,
//               backgroundColor: 'rgba(0, 0, 0, 0.8)',
//               titleColor: '#fff',
//               bodyColor: '#fff',
//               borderColor: '#e5e7eb',
//               borderWidth: 1,
//               callbacks: {
//                 title: function (tooltipItems) {
//                   return `Month: ${tooltipItems[0].label}`;
//                 },
//                 label: function (context) {
//                   return `${context.dataset.label}: ${context.parsed.y} leads`;
//                 },
//                 afterBody: function (tooltipItems) {
//                   const totalLeads = tooltipItems[0].parsed.y;
//                   const convertedLeads = tooltipItems[1] ? tooltipItems[1].parsed.y : 0;
//                   const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0';
//                   return [`Conversion Rate: ${conversionRate}%`];
//                 }
//               }
//             },
//           },
//           scales: {
//             x: {
//               grid: {
//                 display: false,
//               },
//               ticks: {
//                 font: { size: 14 },
//                 color: '#374151',
//                 maxRotation: 0,
//               },
//             },
//             y: {
//               beginAtZero: true,
//               grid: {
//                 color: 'rgba(0, 0, 0, 0.1)',
//               },
//               ticks: {
//                 font: { size: 14 },
//                 color: '#374151',
//                 callback: function (value) {
//                   return Number.isInteger(value) ? value : '';
//                 }
//               },
//             },
//           },
//           interaction: {
//             mode: 'index',
//             intersect: false,
//           },
//           animation: {
//             duration: 1000,
//             easing: 'easeInOutQuart',
//           },
//         },
//       });

//       return () => {
//         if (ctx._chart) ctx._chart.destroy();
//       };
//     }
//   }, [monthlyLeads, monthlyConversions, chartLabels]);

//   // Hash for modal routing
//   useEffect(() => {
//     const onHashChange = () => {
//       if (window.location.hash === '#franchise') {
//         setActiveSection('franchise');
//       } else if (window.location.hash === '#leave') {
//         setActiveSection('leave');
//       } else if (window.location.hash === '#enquiry') {
//         setActiveSection('enquiry');
//       }
//       else {
//         setActiveSection(null);
//       }
//     };
//     window.addEventListener('hashchange', onHashChange);
//     onHashChange();
//     return () => window.removeEventListener('hashchange', onHashChange);
//   }, []);

//   // Fetch all leads (for table/cards)
//   useEffect(() => {
//     const fetchLeads = async () => {
//       setLoadingLeads(true);
//       setLeadsError("");
//       try {
//         const token = localStorage.getItem('access_token') || '';
//         const headers = {
//           'Authorization': `Bearer ${token}`
//         };
        
//         const res = await fetch('http://localhost:3005/api/lead/leads?page=1&limit=1000', { headers });
//         const ct = res.headers.get('content-type');
//         if (!ct || !ct.includes('application/json')) {
//           const text = await res.text();
//           throw new Error('Not JSON: ' + text.slice(0, 100));
//         }
//         const result = await res.json();
//         const leadsArray = result.data || [];
        
//         // Sort leads by ID in descending order (highest ID first)
//         const sorted = [...leadsArray].sort((a, b) => {
//           // Try to use lead_id, lead_key, id, or _id
//           const getId = (lead) => lead.lead_id || lead.lead_key || lead.id || (typeof lead._id === 'string' ? lead._id : '');
//           const numA = parseInt(getId(a)?.replace(/\D/g, ""), 10);
//           const numB = parseInt(getId(b)?.replace(/\D/g, ""), 10);
//           return numB - numA;
//         });
        
//         setLeads(sorted);
//       } catch (err) {
//         setLeadsError(err.message || "Could not load leads");
//       }
//       setLoadingLeads(false);
//     };
//     fetchLeads();
//   }, []);

//   // Handle browser back button
//   useEffect(() => {
//     const handlePopState = () => {
//       setActiveTab(null);
//     };
//     window.addEventListener('popstate', handlePopState);
//     return () => window.removeEventListener('popstate', handlePopState);
//   }, []);

//   function getStatusCounts(data) {
//     return data.reduce((acc, item) => {
//       const status = (item.status || "unknown").toLowerCase().trim();
//       acc[status] = (acc[status] || 0) + 1;
//       acc.total = (acc.total || 0) + 1;
//       return acc;
//     }, {});
//   }
//   function getLeadField(lead, key) {
//     return (
//       lead[key] ||
//       (lead.raw_data && (lead.raw_data[key] || lead.raw_data[key.charAt(0).toUpperCase() + key.slice(1)])) ||
//       ''
//     );
//   }
//   function getCreatedDate(lead) {
//     // Prefer created_at.$date if present
//     if (lead.created_at && lead.created_at.$date) {
//       // Use toLocaleString for user-friendly local format
//       return new Date(lead.created_at.$date).toLocaleString();
//     }
//     // Fallback: "created" field in "MM/DD/YYYY HH:mm AM/PM" format
//     if (lead.created) {
//       // Try to parse and display as local time, else just return string
//       const d = new Date(lead.created);
//       if (!isNaN(d)) return d.toLocaleString();
//       return lead.created;
//     }
//     // Fallback: "timestamp" field (number or string)
//     if (lead.timestamp) {
//       const d = new Date(lead.timestamp);
//       if (!isNaN(d)) return d.toLocaleString();
//       return lead.timestamp;
//     }
//     // Fallback: raw_data.Created
//     if (lead.raw_data && lead.raw_data.Created) return lead.raw_data.Created;
//     return '-';
//   }


//   const animationClasses = "transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 shadow-lg";
//   const statsData = [
//     {
//       title: 'Total Revenue',
//       value: totalRevenue !== null ? `₹${totalRevenue.toLocaleString('en-IN')}` : 'Loading...',
//       trend: '+12%',
//       icon: 'rupee-sign',
//       trendDirection: 'positive',
//       note: 'vs last month',
//     },
//     {
//       title: 'New Leads',
//       value: totalLeads !== null ? totalLeads : 'Loading...',
//       trend: '+8%',
//       icon: 'user-plus',
//       trendDirection: 'positive',
//       note: 'vs last month',
//     },
//     {
//       title: 'Details Converted',
//       value: convertedLeads !== null ? convertedLeads : 'Loading...',
//       trend: '-3%',
//       icon: 'handshake',
//       trendDirection: 'positive',
//       note: 'vs last month',
//     },
//     {
//       title: 'Open Tickets',
//       value: openTickets !== null ? openTickets : 'Loading...',
//       trend: '-15%',
//       icon: 'ticket-alt',
//       trendDirection: 'positive',
//       note: 'vs last month',
//     },
//   ];

//   const totalLeadPages = Math.ceil(leads.length / CARDS_PER_PAGE);
//   const leadsOnCurrentPage = leads.slice(leadPage * CARDS_PER_PAGE, (leadPage + 1) * CARDS_PER_PAGE);

//   const handleLeadNameClick = (lead) => {
//     navigate(`/leads/${lead._id}`, {
//       state: { lead },
//     });
//   }

//   const handleRoleClick = (role) => {
//     setActiveTab(role);
//     window.history.pushState({ role }, '', `#${role}`);
//   };



//   const renderLeadsSection = () => (
//     <div className="bg-white bg-opacity-80 rounded-lg shadow mb-4 sm:mb-6 backdrop-blur-sm">
//       <div className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
//         <div className="flex items-center gap-3 w-full sm:w-auto">
//           <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
//             <i className="fas fa-user-friends text-lg sm:text-xl"></i>
//           </div>
//           <div className="flex-1 sm:flex-initial">
//             <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Leads Overview</h2>
//             <p className="text-sm sm:text-base text-gray-600">
//               You have {leads.length} leads in the system
//             </p>
//           </div>
//         </div>

//         {/* Navigate to full leads table */}
//         <button
//           onClick={() => navigate('/leads/LeadManagement?tab=all')}
//           className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
//         >
//           View All Leads
//         </button>
//       </div>

//       {/* Top 3 Leads Card Grid */}
//       <div className="px-4 sm:px-5 pb-4 sm:pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
//         {loadingLeads ? (
//           <div className="col-span-full text-blue-600 font-semibold text-center py-4">Loading...</div>
//         ) : leadsError ? (
//           <div className="col-span-full text-red-600 font-semibold text-center py-4">{leadsError}</div>
//         ) : leads.slice(0, 3).length === 0 ? (
//           <div className="col-span-full text-gray-500 text-center py-4">No leads found.</div>
//         ) : (
//           leads.slice(0, 3).map((lead, idx) => (
//             <div
//               key={lead.id || lead._id?.$oid || idx}
//               className="bg-blue-50 rounded-lg p-4 sm:p-5 cursor-pointer hover:shadow transition transform hover:scale-105"
//               onClick={() => handleLeadNameClick(lead)}
//               style={{ transitionDelay: `${idx * 50}ms` }}
//             >
//               <div className="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
//                 <div className="text-base sm:text-lg font-semibold text-blue-700 truncate w-full sm:w-auto">{getLeadField(lead, 'name')}</div>
//                 <span className="bg-blue-200 text-gray-800 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">
//                   {getLeadField(lead, 'source_details') || getLeadField(lead, 'source') || 'N/A'}
//                 </span>
//               </div>
//               <div className="text-xs sm:text-sm text-gray-800 space-y-1">
//                 <div className="truncate">
//                   <b>Email:</b> {getLeadField(lead, 'email')}
//                 </div>
//                 <div>
//                   <b>Phone:</b> {getLeadField(lead, 'phone')}
//                 </div>
//                 <div>
//                   <b>Status:</b> {getLeadField(lead, 'status') || lead.status}
//                 </div>
//               </div>
//               <div className="text-xs text-black-400 mt-2">
//                 <b>Created:</b> {getCreatedDate(lead, 'created_at') || lead.created_at || '-'}
//               </div>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );


//   // Modal logic for Franchise/Leave cards
//   if (activeSection === 'franchise') {
//     return (
//       <ErrorBoundary>
//         <FranchiseCard onBack={() => {
//           setActiveSection(null);
//           window.location.hash = '#dashboard';
//         }} />
//       </ErrorBoundary>
//     );
//   }
//   if (activeSection === 'leave') {
//     return (
//       <ErrorBoundary>
//         <LeaveRequestCard
//           onBack={() => {
//             setActiveSection(null);
//             window.location.hash = '#dashboard';
//           }}
//         />
//       </ErrorBoundary>
//     );
//   }
//   if (activeSection === 'enquiry') {
//     return (
//       <EnquiryTracking
//         onBack={() => {
//           setActiveSection(null);
//           window.location.hash = '#dashboard';
//         }}
//       />
//     );
//   }

//   return (
//     <ErrorBoundary>
//       <div className="min-h-screen relative px-2 sm:px-4 lg:px-6" style={{ background: '#f3f4f6' }}>
//         <div className="relative z-20">
//           {/* Navigation */}
//           <div className="bg-white p-3 sm:p-4 rounded-lg shadow mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
//             <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Dashboard</h3>
//             <div className="flex gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
//               {[ 'sales', 'franchise', 'support'].map((role) => (
//                 <button
//                   key={role}
//                   onClick={() => handleRoleClick(role)}
//                   className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm rounded-md font-medium transition flex-1 sm:flex-none ${activeTab === role
//                     ? 'bg-blue-600 text-white'
//                     : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
//                     }`}
//                 >
//                   {role.charAt(0).toUpperCase() + role.slice(1)}
//                 </button>
//               ))}
//             </div>
//           </div>
//           {/* Render Content */}
//           {activeTab ? (
//             <div className="p-3 sm:p-4">
//               <nav className="mb-4 sm:mb-6 text-sm font-medium text-gray-600">
//                 <span
//                   className="cursor-pointer hover:text-blue-600"
//                   onClick={() => {
//                     setActiveTab(null);
//                     window.history.pushState({ role: null }, '', '#dashboard');
//                   }}
//                 >
//                   Dashboard
//                 </span>
//                 <span className="mx-2">&rarr;</span>
//                 <span className="text-gray-800">
//                   {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
//                 </span>
//               </nav>
//               {activeTab === 'sales' && <QuotationsPage />}
//               {activeTab === 'franchise' && <FranchiseManagement />}
//               {activeTab === 'support' && <SupportTicketSystem />}
//             </div>
//           ) : (
//             <div className="page-content p-3 sm:p-4 text-sm sm:text-[15px]">
//               {/* Franchise and Expense charts removed */}
//               {renderLeadsSection()}
//               <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
//                 {statsData.map((stat, idx) => (
//                   <div key={idx} className="bg-white bg-opacity-80 rounded-lg shadow p-3 sm:p-4 hover:shadow-md transition backdrop-blur-sm">
//                     <div className="flex justify-between items-start mb-2">
//                       <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate flex-1">{stat.title}</h3>
//                       <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full ml-2">
//                         <i className={`fas fa-${stat.icon} text-xs sm:text-sm`}></i>
//                       </div>
//                     </div>
//                     <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{stat.value}</h2>
//                     <div className="text-xs sm:text-sm mt-1 flex items-center flex-wrap gap-1">
//                       <span
//                         className={`flex items-center font-medium ${stat.trendDirection === 'positive' ? 'text-green-600' : 'text-red-600'
//                           }`}
//                       >
//                         <i
//                           className={`fas fa-arrow-${stat.trendDirection === 'positive' ? 'up' : 'down'} mr-1`}
//                         ></i>
//                         {stat.trend}
//                       </span>
//                       <span className="text-xs text-gray-500">{stat.note}</span>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//               {/* Chart Section */}
//               <div className="bg-white bg-opacity-80 rounded-lg shadow mb-4 sm:mb-6 backdrop-blur-sm">
//                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 border-b gap-3">
//                   <div className="flex-1">
//                     <h3 className="text-sm sm:text-base font-semibold text-gray-800">Leads Overview</h3>
//                     <p className="text-xs sm:text-sm text-gray-500">Last 6 Months Performance ({chartLabels.length > 0 ? `${chartLabels[0]} - ${chartLabels[chartLabels.length - 1]}` : 'Loading...'})</p>
//                   </div>
//                   <div className="flex gap-2">
//                     <button className="text-gray-600 hover:text-black p-1.5 rounded hover:bg-gray-100">
//                       <i className="fas fa-download"></i>
//                     </button>
//                     <button className="text-gray-600 hover:text-black p-1.5 rounded hover:bg-gray-100">
//                       <i className="fas fa-ellipsis-v"></i>
//                     </button>
//                   </div>
//                 </div>
//                 <div className="p-3 sm:p-4">
//                   {monthlyLeads.length > 0 && monthlyConversions.length > 0 ? (
//                     <div className="h-[250px] sm:h-[320px]">
//                       <canvas id="leadsChart"></canvas>
//                     </div>
//                   ) : (
//                     <div className="h-[250px] sm:h-[320px] flex items-center justify-center">
//                       <div className="text-center">
//                         <i className="fas fa-chart-bar text-3xl sm:text-4xl text-gray-300 mb-4"></i>
//                         <p className="text-gray-500 text-sm sm:text-base">Loading chart data...</p>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Recent Leads Table */}
//               <div className="bg-white bg-opacity-80 rounded-lg shadow mb-4 sm:mb-6 backdrop-blur-sm">
//                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 border-b gap-3">
//                   <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Leads</h3>
//                   <button
//                     onClick={() => setShowAllLeads(!showAllLeads)}
//                     className="text-sm text-blue-600 hover:text-blue-800 font-medium"
//                   >
//                     {showAllLeads ? 'Show Less' : 'Show All'}
//                   </button>
//                 </div>

//                 {loadingLeads ? (
//                   <div className="text-center py-8">
//                     <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
//                     <p className="mt-2 text-gray-600">Loading leads...</p>
//                   </div>
//                 ) : leadsError ? (
//                   <div className="text-center py-8">
//                     <div className="text-red-600 mb-2">
//                       <i className="fas fa-exclamation-triangle text-2xl"></i>
//                     </div>
//                     <p className="text-red-600 font-semibold">{leadsError}</p>
//                   </div>
//                 ) : leads.length === 0 ? (
//                   <div className="text-center py-8">
//                     <div className="text-gray-400 mb-2">
//                       <i className="fas fa-users text-3xl"></i>
//                     </div>
//                     <p className="text-gray-500">No leads found</p>
//                     <button
//                       onClick={() => setShowImportModal(true)}
//                       className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
//                     >
//                       Import leads to get started
//                     </button>
//                   </div>
//                 ) : (
//                   <>
//                     {/* Mobile Card View */}
//                     <div className="block sm:hidden">
//                       {(showAllLeads ? leads : leads.slice(0, 10)).map((lead, idx) => (
//                         <div
//                           key={lead.id || lead._id?.$oid || idx}
//                           className="border-b p-4 hover:bg-gray-50 transition-colors"
//                         >
//                           <div className="flex justify-between items-start mb-2">
//                             <div className="font-semibold text-gray-900 text-sm">
//                               {getLeadField(lead, 'name') || 'N/A'}
//                             </div>
//                             <span
//                               className={`inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 ${(getLeadField(lead, 'status') || lead.status || '').toLowerCase() === 'converted'
//                                 ? 'bg-green-100 text-green-800'
//                                 : (getLeadField(lead, 'status') || lead.status || '').toLowerCase() === 'qualified'
//                                   ? 'bg-blue-100 text-blue-800'
//                                   : (getLeadField(lead, 'status') || lead.status || '').toLowerCase() === 'contacted'
//                                     ? 'bg-yellow-100 text-yellow-800'
//                                     : 'bg-gray-100 text-gray-800'
//                                 }`}
//                             >
//                               {getLeadField(lead, 'status') || lead.status || 'Unknown'}
//                             </span>
//                           </div>
//                           <div className="text-xs text-gray-600 space-y-1">
//                             <div className="flex items-center justify-between">
//                               <span><strong>ID:</strong> {getLeadField(lead, 'lead_id') || 'N/A'}</span>
//                             </div>
//                             <div><strong>Email:</strong> {getLeadField(lead, 'email') || 'N/A'}</div>
//                             <div><strong>Phone:</strong> {getLeadField(lead, 'phone') || 'N/A'}</div>
//                             <div className="flex items-center justify-between">
//                               <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
//                                 {getLeadField(lead, 'source_details') || getLeadField(lead, 'source') || 'N/A'}
//                               </span>
//                               <button
//                                 onClick={() => handleLeadNameClick(lead)}
//                                 className="text-blue-600 hover:text-blue-700 text-xs font-medium p-2"
//                                 title="View Details"
//                               >
//                                 <i className="fas fa-edit"></i>
//                               </button>
//                             </div>
//                             <div className="text-xs text-gray-500">
//                               <strong>Created:</strong> {getCreatedDate(lead)}
//                             </div>
//                           </div>
//                         </div>
//                       ))}
//                     </div>

//                     {/* Desktop Table View */}
//                     <div className="hidden sm:block overflow-x-auto">
//                       <table className="w-full text-xs sm:text-sm">
//                         <thead>
//                           <tr className="border-b bg-gray-50">
//                             <th className="text-left p-2 sm:p-3 font-semibold text-gray-700">Lead_id</th>
//                             <th className="text-left p-2 sm:p-3 font-semibold text-gray-700">Name</th>
//                             <th className="text-left p-2 sm:p-3 font-semibold text-gray-700 hidden md:table-cell">Email</th>
//                             <th className="text-left p-2 sm:p-3 font-semibold text-gray-700">Phone</th>
//                             <th className="text-left p-2 sm:p-3 font-semibold text-gray-700">Status</th>
//                             <th className="text-left p-2 sm:p-3 font-semibold text-gray-700 hidden lg:table-cell">Source</th>
//                             <th className="text-left p-2 sm:p-3 font-semibold text-gray-700 hidden xl:table-cell">Created</th>
//                             <th className="text-left p-2 sm:p-3 font-semibold text-gray-700">Actions</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {(showAllLeads ? leads : leads.slice(0, 10)).map((lead, idx) => (
//                             <tr
//                               key={lead.id || lead._id?.$oid || idx}
//                               className="border-b hover:bg-gray-50 transition-colors"
//                             >
//                               <td className="p-2 sm:p-3">
//                                 <div className="font-semibold text-gray-900 truncate max-w-[80px]">
//                                   {getLeadField(lead, 'lead_id') || 'N/A'}
//                                 </div>
//                               </td>
//                               <td className="p-2 sm:p-3">
//                                 <div className="font-semibold text-gray-900 truncate max-w-[120px]">
//                                   {getLeadField(lead, 'name') || 'N/A'}
//                                 </div>
//                               </td>
//                               <td className="p-2 sm:p-3 text-gray-600 hidden md:table-cell">
//                                 <div className="truncate max-w-[150px]">
//                                   {getLeadField(lead, 'email') || 'N/A'}
//                                 </div>
//                               </td>
//                               <td className="p-2 sm:p-3 text-gray-600">
//                                 <div className="truncate max-w-[100px]">
//                                   {getLeadField(lead, 'phone') || 'N/A'}
//                                 </div>
//                               </td>
//                               <td className="p-2 sm:p-3">
//                                 <span
//                                   className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${(getLeadField(lead, 'status') || lead.status || '').toLowerCase() === 'converted'
//                                     ? 'bg-green-100 text-green-800'
//                                     : (getLeadField(lead, 'status') || lead.status || '').toLowerCase() === 'qualified'
//                                       ? 'bg-blue-100 text-blue-800'
//                                       : (getLeadField(lead, 'status') || lead.status || '').toLowerCase() === 'contacted'
//                                         ? 'bg-yellow-100 text-yellow-800'
//                                         : 'bg-gray-100 text-gray-800'
//                                     }`}
//                                 >
//                                   {getLeadField(lead, 'status') || lead.status || 'Unknown'}
//                                 </span>
//                               </td>
//                               <td className="p-2 sm:p-3 hidden lg:table-cell">
//                                 <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium truncate max-w-[100px]">
//                                   {getLeadField(lead, 'source_details') || getLeadField(lead, 'source') || 'N/A'}
//                                 </span>
//                               </td>
//                               <td className="p-2 sm:p-3 text-gray-600 text-xs hidden xl:table-cell">
//                                 <div className="truncate max-w-[120px]">
//                                   {getCreatedDate(lead)}
//                                 </div>
//                               </td>
//                               <td className="p-2 sm:p-3">
//                                 <div className="flex gap-2">
//                                   <button
//                                     onClick={() => handleLeadNameClick(lead)}
//                                     className="text-blue-600 hover:text-blue-700 text-xs font-medium p-1"
//                                     title="View Details"
//                                   >
//                                     <i className="fas fa-edit"></i>
//                                   </button>
//                                 </div>
//                               </td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>

//                     {/* Show pagination info when showing all leads */}
//                     {showAllLeads && leads.length > 10 && (
//                       <div className="mt-4 p-4 text-center text-sm text-gray-600">
//                         Showing all {leads.length} leads
//                       </div>
//                     )}
//                   </>
//                 )}
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </ErrorBoundary>
//   );
// };

// export default Dashboard;



import React, { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { useNavigate } from "react-router-dom";
Chart.register(...registerables);

const API_BASE = "http://localhost:3005/api";

const ATTENDANCE_DUMMY = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  present: [93, 97, 95, 94, 96, 95],
  absent: [7, 3, 5, 6, 4, 5],
};

function calcTrend(current, previous) {
  if (typeof current !== "number" || typeof previous !== "number" || previous === 0)
    return { trend: "—", trendDirection: "positive" };
  const delta = current - previous;
  const trend = (delta >= 0 ? "+" : "") + Math.round((delta / previous) * 100) + "%";
  return { trend, trendDirection: delta >= 0 ? "positive" : "negative" };
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const energyRef = useRef(null);
  const attendanceRef = useRef(null);
  const energyChartRef = useRef(null);
  const attendanceChartRef = useRef(null);

  const [energyMode, setEnergyMode] = useState("period");
  const [dashboardCards, setDashboardCards] = useState([
    {
      key: "total_inventory",
      title: "Total Inventory Items",
      value: "—",
      trend: "—",
      trendDirection: "positive",
      icon: "boxes",
      note: "vs last week"
    },
    {
      key: "attendance",
      title: "Today's Attendance",
      value: "95%",
      trend: "+4%",
      trendDirection: "positive",
      icon: "user-check",
      note: "of registered staff",
      static: true
    },
    {
      key: "absent",
      title: "Absent Today",
      value: 7,
      trend: "-2%",
      trendDirection: "negative",
      icon: "user-times",
      note: "vs yesterday",
      static: true
    },
    {
      key: "energy_used",
      title: "Energy Used (kWh)",
      value: "—",
      trend: "—",
      trendDirection: "positive",
      icon: "bolt",
      note: "Select period"
    }
  ]);
  const [energyData, setEnergyData] = useState({ labels: [], usage: [], cost: [], totalUsage: 0 });
  const [inventoryData, setInventoryData] = useState([]);

  // Fetch inventory/attendance stats & trend (with Authorization header inline)
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${API_BASE}/stock/products-trend?period_days=7`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const currentVal = data?.total_present_products || 0;
        const prevVal = data?.previous_total_present_products || 0;
        const { trend, trendDirection } = calcTrend(currentVal, prevVal);
        setDashboardCards(cards =>
          cards.map(card =>
            card.key === "total_inventory"
              ? { ...card, value: currentVal, trend, trendDirection }
              : card
          )
        );
      })
      .catch(e => console.error("Trend fetch failed:", e.message));

    fetch(`${API_BASE}/stock/products`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(products => {
        setInventoryData(products.map(prod => ({
          item: prod.name,
          available: (prod.warehouse_qty || 0) +
            (prod.depot_qty && typeof prod.depot_qty === "object"
              ? Object.values(prod.depot_qty).reduce((a, b) => a + b, 0)
              : 0),
          critical: prod.low_stock_threshold !== undefined &&
            ((prod.warehouse_qty || 0) + (prod.depot_qty && typeof prod.depot_qty === "object"
              ? Object.values(prod.depot_qty).reduce((a, b) => a + b, 0)
              : 0)) <= prod.low_stock_threshold,
          icon: "boxes",
          category: prod.category
        })));
      })
      .catch(e => console.error("Product fetch failed:", e.message));
  }, []);

  // Dynamic energy usage trend/stats (Authorization header inline)
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const windowDays = 7;
    const today = new Date().toISOString().slice(0, 10);

    if (energyMode === "all") {
      fetch(`${API_BASE}/generators-utilities/reports?start=1970-01-01&end=${today}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(res => {
          const trendArr = res?.trend || [];
          const totalAllTime = trendArr.reduce((a, b) => a + (b.energy || 0), 0);
          setDashboardCards(cards =>
            cards.map(card =>
              card.key === "energy_used"
                ? { ...card, value: totalAllTime, note: "All Time (Total kWh)", trend: "+0%", trendDirection: undefined }
                : card
            )
          );
          setEnergyData({
            labels: trendArr.map(t => t.date?.slice(0, 10)),
            usage: trendArr.map(t => t.energy || 0),
            cost: trendArr.map(t => t.cost || 0),
            totalUsage: totalAllTime
          });
        })
        .catch(e => console.error("Energy fetch failed:", e.message));
      return;
    }

    const prevStart = new Date();
    prevStart.setDate(prevStart.getDate() - 2 * windowDays + 1);
    fetch(`${API_BASE}/generators-utilities/reports?start=${encodeURIComponent(prevStart.toISOString().slice(0, 10))}&end=${today}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(res => {
        const trendArr = res?.trend || [];
        const prevTrend = trendArr.slice(0, windowDays);
        const currTrend = trendArr.slice(windowDays, windowDays * 2);
        const totalPrev = prevTrend.reduce((a, b) => a + (b.energy || 0), 0);
        const totalNow = currTrend.reduce((a, b) => a + (b.energy || 0), 0);
        const { trend, trendDirection } = calcTrend(totalNow, totalPrev);
        setDashboardCards(cards => cards.map(card => {
          if (card.key === "energy_used") {
            return { ...card, value: totalNow, note: `Last ${windowDays} days`, trend, trendDirection }
          }
          return card;
        }));
        setEnergyData({
          labels: currTrend.map(t => t.date?.slice(0,10)),
          usage: currTrend.map(t => t.energy || 0),
          cost: currTrend.map(t => t.cost || 0),
          totalUsage: totalNow
        });
      })
      .catch(e => console.error("Energy fetch failed:", e.message));
  }, [energyMode]);

  // Chart rendering for energy/attendance (unchanged)
  useEffect(() => {
    if (energyRef.current && energyData.labels.length) {
      if (energyChartRef.current) energyChartRef.current.destroy();
      energyChartRef.current = new Chart(energyRef.current, {
        type: "bar",
        data: {
          labels: energyData.labels,
          datasets: [
            {
              label: "Energy Used (kWh)",
              data: energyData.usage,
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              borderColor: "#6366f1",
              borderWidth: 2,
              yAxisID: "y1",
              borderRadius: 12
            },
            {
              label: "Cost (₹)",
              type: "line",
              data: energyData.cost,
              borderColor: "#f59e42",
              backgroundColor: "#fff1d2",
              pointBackgroundColor: "#f59e42",
              borderWidth: 3,
              fill: false,
              yAxisID: "y2",
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { font: { size: 15, family: "Inter, sans-serif" }, color: "#2d3748" } },
            tooltip: { backgroundColor: "#f3f6fd", borderColor: "#6366f1", borderWidth: 1 }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 13 }, color: "#8392a6" } },
            y1: { type: "linear", position: "left", title: { display: true, text: "Energy (kWh)", color: "#667eea" }, beginAtZero: true, grid: { color: "#e0e7ef" }, ticks: { font: { size: 13 }, color: "#6366f1" } },
            y2: { type: "linear", position: "right", title: { display: true, text: "Cost (₹)", color: "#f59e42" }, beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { font: { size: 12 }, color: "#f59e42" } }
          }
        }
      });
    }
    if (attendanceRef.current) {
      if (attendanceChartRef.current) attendanceChartRef.current.destroy();
      attendanceChartRef.current = new Chart(attendanceRef.current, {
        type: "pie",
        data: {
          labels: ["Present", "Absent"],
          datasets: [
            {
              data: [
                ATTENDANCE_DUMMY.present.reduce((a, b) => a + b, 0),
                ATTENDANCE_DUMMY.absent.reduce((a, b) => a + b, 0)
              ],
              backgroundColor: ["#10b981bb", "#ef4444bb"],
              borderWidth: 2,
              borderColor: "#fff"
            }
          ]
        },
        options: {
          plugins: { legend: { position: "bottom", labels: { font: { size: 15 } } } }
        }
      });
    }
    return () => {
      if (energyChartRef.current) energyChartRef.current.destroy();
      if (attendanceChartRef.current) attendanceChartRef.current.destroy();
    };
  }, [energyData]);

  function handleInventoryClick() {
    navigate("/inventory");
  }

  return (
    <div className="min-h-screen bg-gray-50 px-2 sm:px-4 lg:px-6 pb-8">
      {/* Dashboard Header with Period Selector at Top Right */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h3 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h3>
        <select
          className="ml-2 border rounded px-3 py-1 text-xs bg-gray-100 text-blue-700 font-semibold"
          value={energyMode}
          onChange={e => setEnergyMode(e.target.value)}
          style={{ minWidth: 110 }}
        >
          <option value="period">Last 7 Days</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {dashboardCards.map((stat) => (
          <div key={stat.title}
            className="bg-white rounded-2xl border p-5 flex flex-col justify-between"
            style={{ minHeight: 135 }}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">{stat.note}</div>
                <div className="text-base font-semibold text-blue-900">{stat.title}</div>
              </div>
              {stat.icon && (
                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <i className={`fas fa-${stat.icon} text-lg`} />
                </div>
              )}
            </div>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-3xl font-extrabold text-gray-900">{stat.value}</span>
              {stat.trend && (
                <span className={`text-sm font-bold ${stat.trendDirection === "positive" ? "text-green-600" : "text-red-600"}`}>
                  {stat.trendDirection && <i className={`fas fa-arrow-${stat.trendDirection === "positive" ? "up" : "down"} mr-1`} />}
                  {stat.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {/* Energy Chart Card */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b mb-3">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Energy Usage & Cost</h3>
              <p className="text-xs font-semibold text-gray-600">{energyMode === "all" ? "All Time" : "Last 7 Days"}</p>
            </div>
          </div>
          <div className="h-[230px] sm:h-[300px]">
            <canvas ref={energyRef} />
          </div>
        </div>
        {/* Attendance Pie Card */}
        <div className="bg-white rounded-xl border p-4 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b mb-3">
            <h3 className="font-semibold text-lg text-gray-900">Attendance Analytics</h3>
            <span className="bg-green-50 text-green-700 font-semibold rounded-full px-4 py-1 text-xs">Staff: 100</span>
          </div>
          <div className="h-[180px] sm:h-[260px] flex items-center justify-center">
            <canvas ref={attendanceRef} style={{ maxWidth: 210, maxHeight: 210 }} />
          </div>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg sm:text-xl font-bold text-blue-900">Inventory Overview</h3>
          <button
            className="px-5 py-2 font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleInventoryClick}
          >
            View Inventory Details
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-5 p-6 bg-white rounded-xl border">
          {inventoryData.map((item) => (
            <div
              key={item.item}
              className={`flex flex-col items-center justify-center py-6 px-4 rounded-xl border-2 transition cursor-pointer ${
                item.critical ? "border-pink-400 bg-red-50" : "border-blue-200 bg-blue-50"
              } hover:scale-[1.03]`}
            >
              <div className="bg-white rounded-full p-3 mb-2 text-blue-800 shadow">
                <i className={`fas fa-${item.icon} text-2xl`} />
              </div>
              <div className="text-base font-semibold mb-1 text-blue-900">{item.item}</div>
              <div className="text-2xl font-bold text-indigo-700 mb-1">{item.available}</div>
              {item.critical && (
                <div className="text-xs font-semibold text-pink-700 bg-pink-100 rounded-xl px-3 py-1 mt-2">
                  Low Stock!
                </div>
              )}
              {item.category && <div className="text-xs text-gray-500 mt-1">{item.category}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
