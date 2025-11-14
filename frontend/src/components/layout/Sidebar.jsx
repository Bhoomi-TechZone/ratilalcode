import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

function getUserPermissions(allRolesFromBackend, currentRoleNames) {
  const perms = new Set();
  if (!Array.isArray(allRolesFromBackend) || !Array.isArray(currentRoleNames)) return perms;
  for (const roleName of currentRoleNames) {
    // Try to find role by name (case-insensitive)
    const match = allRolesFromBackend.find(
      r => (r.name && r.name.toLowerCase() === roleName.toLowerCase())
    );
    if (match && Array.isArray(match.permissions)) {
      match.permissions.forEach(p => perms.add(p));
    }
  }
  return perms;
}

// Helper function to check if user is admin or HR
function isAdminOrHR(currentRoles) {
  if (!Array.isArray(currentRoles)) return false;
  return currentRoles.some(role => 
    role.toLowerCase().includes('admin') || 
    role.toLowerCase().includes('hr') ||
    role.toLowerCase() === 'administrator'
  );
}

// Map menu items to permission keys (must match backend ALL_PERMISSIONS keys)
const menuItems = [
  { icon: 'building', label: 'Companies', path: '/company-management', permission: 'company_management' },
  { icon: 'chart-line', label: 'Global Reports', path: '/global-reports', permission: 'global_reports' },
  { icon: 'chart-pie', label: 'Dashboard', path: '/dashboard', permission: 'dashboard' },
  //{ icon: 'funnel-dollar', label: 'Leads & Sales', path: '/leads', permission: 'leads', 
    //submenu: [
      //{ label: 'Lead Management', path: '/leads/LeadManagement', permission: 'leads' },
      //{ label: 'Hierarchy Assignment', path: '/hierarchy-assignment', permission: 'leads' },
      //{ label: 'Quotations', path: '/leads/quotations', permission: 'leads' },
      //{ label: 'Payment Tracking', path: '/leads/payments', permission: 'leads' },
    //]
  //},
  { icon: 'user', label: 'Users', path: '/users', permission: 'users',
    submenu: [
      { label: 'User', path: '/users/list', permission: 'users' },
      { label: 'Roles', path: '/users/roles', permission: 'roles' },
      // { label: 'Hierarchy', path: '/users/hierarchy', permission: 'users' }
    ]
  },
  { icon: 'clock', label: 'Attendance', path: '/hr', permission: 'hr', requiresAdminOrHR: true},
  { icon: 'users', label: 'Customers', path: '/customers', permission: 'customers' },
  { icon: 'bolt', label: 'Generators & Utilities', path: '/generator-management', permission: 'generator_management' },
  { icon: 'store', label: 'Site Management', path: '/site-management', permission: 'site_management' },
  { icon: 'boxes', label: 'Inventory', path: '/inventory', permission: 'inventory' },
  //{ icon: 'store', label: 'Franchise Management', path: '/franchise', permission: 'franchise' },
  { icon: 'user-tie', label: 'HR & Staff', path: '/hr', permission: 'hr',
    submenu: [
      { label: 'Staff Management', path: '/hr', permission: 'hr' },
      { label: 'My Attendance', path: '/attendance', permission: 'hr'},
      { label: 'My Leave Requests', path: '/my-leave-requests', permission: 'hr' },
    ]
  },
  //{ icon: 'bell', label: 'Alerts', path: '/alerts'},
  { icon: 'bell', label: 'Alerts', path: '/alerts', permission: 'alerts' },
  { icon: 'tasks', label: 'Tasks & Workflow', path: '/tasks', permission: 'tasks' },
  { icon: 'chart-bar', label: 'Reports', path: '/energy-reports', permission: 'reports' },
  //{ icon: 'rupee-sign', label: 'Accounts', path: '/accounts', permission: 'accounts' },
  //{ icon: 'headset', label: 'Support Tickets', path: '/tickets', permission: 'tickets' },
  //{ icon: 'file-alt', label: 'Documents', path: '/documents', permission: 'documents' },
  // { icon: 'bullhorn', label: 'Marketing', path: '/marketing', permission: 'marketing' },
  //{ icon: 'cog', label: 'Admin', path: '/admin', permission: 'admin' },
];

const Sidebar = ({ isOpen, toggleSidebar, isMobile }) => {
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState('Unknown User');
  const [currentRoles, setCurrentRoles] = useState([]); // role name(s), e.g. ['admin']
  const [roleObjects, setRoleObjects] = useState([]); // all roles from backend, must be fetched!
  const [userPermissions, setUserPermissions] = useState(new Set());
  const [expandedItems, setExpandedItems] = useState({
    '/leads': true,
    '/users': false,
    '/hr': false
  });

  // Fetch roles from backend on mount
  useEffect(() => {
    fetch("http://localhost:3005/api/roles/", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`
      }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setRoleObjects(Array.isArray(data) ? data : []))
      .catch(() => setRoleObjects([]));
  }, []);

  // Get user/roles from localStorage
  useEffect(() => {
    let userObj = null;
    let fullName = null;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        userObj = JSON.parse(userStr);
        fullName = userObj.full_name || userObj.username || 'Unknown User';
      }
    } catch {
      fullName = null;
    }
    if (!fullName) {
      fullName = localStorage.getItem('full_name') || 'Unknown User';
    }
    let roles = [];
    if (userObj && userObj.roles) {
      if (Array.isArray(userObj.roles)) {
        // Accept array of objects or strings
        roles = userObj.roles.map(r => typeof r === 'string' ? r : (r.name || r.id));
      } else if (typeof userObj.roles === 'string') {
        if (userObj.roles.includes(',')) {
          roles = userObj.roles.split(',').map(r => r.trim());
        } else {
          roles = [userObj.roles];
        }
      }
    } else {
      const storedRoles = localStorage.getItem('roles');
      if (storedRoles) {
        try {
          const parsed = JSON.parse(storedRoles);
          if (Array.isArray(parsed)) {
            roles = parsed;
          } else if (typeof parsed === 'string') {
            if (parsed.includes(',')) {
              roles = parsed.split(',').map(r => r.trim());
            } else {
              roles = [parsed];
            }
          }
        } catch {
          roles = [storedRoles];
        }
      }
    }
    setCurrentUser(fullName);
    setCurrentRoles(roles.map(r => typeof r === 'string' ? r.toLowerCase() : r));
  }, []);

  useEffect(() => {
    setUserPermissions(getUserPermissions(roleObjects, currentRoles));
  }, [roleObjects, currentRoles]);

  useEffect(() => {
    const currentTopPath = '/' + location.pathname.split('/')[1];
    const newExpandedState = {};
    Object.keys(expandedItems).forEach(path => {
      newExpandedState[path] = (currentTopPath === path);
    });
    setExpandedItems(prev => ({
      ...prev,
      ...newExpandedState
    }));
  }, [location.pathname]);

  const toggleSubmenu = (path, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedItems(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleMenuItemClick = (path) => {
    if (!menuItems.find(item => item.path === path)?.submenu) {
      setExpandedItems({});
    }
    if (isMobile) {
      toggleSidebar(false);
    }
  };

  const isPathActive = (path) => {
    if (location.pathname === path) return true;
    if (location.pathname.startsWith(path + '/')) return true;
    const item = menuItems.find(m => m.path === path);
    if (item?.submenu) {
      return item.submenu.some(sub => location.pathname === sub.path);
    }
    return false;
  };


  const filteredMenuItems = menuItems.filter(item =>
    userPermissions.has(item.permission)
  );

  return (
    <>
      {isMobile && isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-20" onClick={() => toggleSidebar(false)} />
      )}

      <aside
        className={`h-screen bg-slate-900 text-white transition-all duration-300 ease-in-out flex-shrink-0
        ${isMobile 
          ? `fixed top-0 left-0 h-full z-30 ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
          : `relative ${isOpen ? 'w-56' : 'w-18'}`}
        overflow-y-auto overflow-x-hidden`}
      >
        {/* Background image with opacity */}
        <img
          src="/img2.jpg"
          alt="Sidebar Background"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.24,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        <div className="bg-slate-900 border-b border-slate-800 flex items-center justify-between p-4 relative z-10">
          <div className="flex items-center gap-2 overflow-hidden">
            <img src="/bharat.png" alt="Navkar Finance" className="h-6 w-6 rounded-full object-cover" />
            {(isOpen || isMobile) && <span className="text-lg font-semibold truncate">Ratilal & Sons</span>}
          </div>
          <button onClick={() => toggleSidebar(!isOpen)} className="text-gray-400 hover:text-white">
            <i className={`fas fa-${isMobile ? 'times' : isOpen ? 'chevron-left' : 'chevron-right'} text-sm`}></i>
          </button>
        </div>

        <div className="flex items-center p-4 border-b border-slate-800 relative z-10">
          <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
            <i className="fas fa-user text-white"></i>
          </div>
          {(isOpen || isMobile) && (
            <div className="ml-3 overflow-hidden">
              <div className="text-base font-medium truncate">{currentUser}</div>
              <div className="text-sm text-blue-300 truncate capitalize">
                {currentRoles.length > 0 ? currentRoles.join(', ') : 'No role assigned'}
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="py-2 relative z-10">
          <ul>
            {filteredMenuItems.map(item => (
              <li key={item.path} className="relative">
                {item.submenu ? (
                  // Only show submenu if user has permission for at least one subitem
                  <>
                    {item.submenu.some(sub => {
                      // First check if user has permission
                      const hasPermission = userPermissions.has(sub.permission);
                      if (!hasPermission) return false;
                      
                      // If item requires admin/HR, check user role
                      if (sub.requiresAdminOrHR) {
                        return isAdminOrHR(currentRoles);
                      }
                      
                      return true;
                    }) && (
                      <>
                        <div
                          className={`flex items-center justify-between py-2.5 px-4 text-sm transition cursor-pointer
                            ${isPathActive(item.path)
                              ? 'bg-slate-800 border-l-4 border-blue-500'
                              : 'hover:bg-slate-800 border-l-4 border-transparent'}
                          `}
                          onClick={(e) => toggleSubmenu(item.path, e)}
                        >
                          <div className="flex items-center">
                            <div className={`text-center ${isOpen || isMobile ? 'w-6' : 'w-full'}`}>
                              <i className={`fas fa-${item.icon}`}></i>
                            </div>
                            {(isOpen || isMobile) && <span className="ml-2 truncate">{item.label}</span>}
                          </div>
                          {(isOpen || isMobile) && (
                            <i className={`fas fa-chevron-${expandedItems[item.path] ? 'down' : 'right'} text-xs`}></i>
                          )}
                        </div>
                        {expandedItems[item.path] && (isOpen || isMobile) && (
                          <ul className="pl-0 bg-slate-950 border-l-4 border-blue-500">
                            {item.submenu
                              .filter(sub => {
                                const hasPermission = userPermissions.has(sub.permission);
                                if (!hasPermission) return false;

                                console.log('Checking', sub.label, { currentRoles, hideForRoles: sub.hideForRoles });
                                if (sub.hideForRoles && sub.hideForRoles.some(role => currentRoles.includes(role))) {
                                  return false;
                                }

                                // If item requires admin/HR, check user role
                                if (sub.requiresAdminOrHR) {
                                  return isAdminOrHR(currentRoles);
                                }

                                // If item is set to not show for admin, hide for admin
                                if (sub.requireAdmin === false && isAdminOrHR(currentRoles)) {
                                  return false;
                                }

                                return true;
                              })
                              .map(subItem => (
                                <li key={subItem.path}>
                                  <NavLink
                                    to={subItem.path}
                                    className={({ isActive }) => `
                                      flex items-center pl-12 py-2.5 pr-4 text-sm transition
                                      ${isActive ? 'bg-slate-900 text-blue-300' : 'text-gray-300 hover:bg-slate-800 hover:text-white'}
                                    `}
                                    onClick={() => isMobile && toggleSidebar(false)}
                                  >
                                    <span className="truncate">{subItem.label}</span>
                                  </NavLink>
                                </li>
                              ))}
                          </ul>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => `
                      flex items-center py-2.5 px-4 text-sm transition
                      ${isActive ? 'bg-slate-800 border-l-4 border-blue-500' : 'hover:bg-slate-800 border-l-4 border-transparent'}
                    `}
                    onClick={() => handleMenuItemClick(item.path)}
                  >
                    <div className={`text-center ${isOpen || isMobile ? 'w-6' : 'w-full'}`}>
                      <i className={`fas fa-${item.icon}`}></i>
                    </div>
                    {(isOpen || isMobile) && <span className="ml-3 truncate">{item.label}</span>}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;




