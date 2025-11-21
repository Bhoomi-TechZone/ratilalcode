import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionContext.jsx';

const menuItems = [
  { icon: 'chart-pie', label: 'Dashboard', path: '/dashboard', permission: 'dashboard:read' },
  {
    icon: 'user', label: 'Users', path: '/users', permission: 'users:manage',
    submenu: [
      { label: 'User List', path: '/users/list', permission: 'users:read' },
      { label: 'User Roles', path: '/users/roles', permission: 'roles:read' },
    ]
  },
  {
    icon: 'clock', label: 'Attendance', path: '/hr',
    submenu: [
      { label: 'My Attendance', path: '/my-attendance', permission: 'attendance:read' },
      { label: 'My Leave Requests', path: '/my-leave-requests', permission: 'attendance:read' },
    ]
  },
  { icon: 'users', label: 'Customers', path: '/customers', permission: 'customers:manage' },
  { icon: 'bolt', label: 'Generators & Utilities', path: '/generator-management', permission: 'generator_management:manage' },
  { icon: 'store', label: 'Site Management', path: '/site-management', permission: 'site_management:manage' },
  { icon: 'boxes', label: 'Inventory', path: '/inventory', permission: 'inventory:manage' },
  {
    icon: 'user-tie', label: 'HR & Staff', path: '/hr/staff',
    submenu: [
      { label: 'Mark Attendance', path: '/attendance', permission: ['attendance:read', 'attendance:manage'] },
      { label: 'Staff Management', path: '/hr', permission: 'hr:manage' },
    ]
  },
  { icon: 'bell', label: 'Alerts', path: '/alerts', permission: 'alerts:read' },
  { icon: 'tasks', label: 'Tasks & Workflow', path: '/tasks', permission: 'tasks:manage' },
  { icon: 'chart-bar', label: 'Reports', path: '/energy-reports', permission: 'global_reports:view' },
];

function hasPermission(userPermissions, required) {
  if (!required) return true;
  if (userPermissions.includes('admin:manage')) return true;
  if (Array.isArray(required)) return required.some(r => userPermissions.includes(r));
  return userPermissions.includes(required);
}
function hasAnyAttendancePermission(userPermissions) {
  return userPermissions.some(p => p.startsWith("attendance:"));
}
function hasHRManagePermission(userPermissions) {
  return userPermissions.includes("hr:manage") || userPermissions.includes("admin:manage");
}
function filterMenuByPermissions(menu, userPermissions) {
  return menu
    .filter(item => {
      if (item.label === "Attendance") return hasAnyAttendancePermission(userPermissions);
      if (item.label === "HR & Staff") return hasHRManagePermission(userPermissions);
      return hasPermission(userPermissions, item.permission) ||
        (item.submenu && item.submenu.some(sub => hasPermission(userPermissions, sub.permission)));
    })
    .map(item => ({
      ...item,
      submenu: item.submenu
        ? item.submenu.filter(sub => hasPermission(userPermissions, sub.permission))
        : undefined
    }));
}

const Sidebar = ({ isOpen, toggleSidebar, isMobile }) => {
  const location = useLocation();
  const { userPermissions, currentUser, roleNames } = usePermissions();
  const [expandedMenu, setExpandedMenu] = useState(null);

  // EXPAND/collapse only the submenu for actual open child
  useEffect(() => {
    const matchParent = menuItems.find(
      item => item.submenu && item.submenu.some(sub => sub.path === location.pathname)
    );
    if (matchParent) setExpandedMenu(matchParent.path);
    else setExpandedMenu(null);
  }, [location.pathname]);

  const toggleSubmenu = (path, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedMenu(prev => prev === path ? null : path);
  };
  const resetExpandedMenus = () => setExpandedMenu(null);

  const filteredMenuItems = filterMenuByPermissions(menuItems, userPermissions);

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
        {/* Brand */}
        <div className="bg-slate-900 border-b border-slate-800 flex items-center justify-between p-4 relative z-10">
          <div className="flex items-center gap-2 overflow-hidden">
            <img src="/bharat.png" alt="Ratilal" className="h-6 w-6 rounded-full object-cover" />
            {(isOpen || isMobile) && <span className="text-lg font-semibold truncate">Ratilal & Sons</span>}
          </div>
          <button onClick={() => toggleSidebar(!isOpen)} className="text-gray-400 hover:text-white">
            <i className={`fas fa-${isMobile ? 'times' : isOpen ? 'chevron-left' : 'chevron-right'} text-sm`}></i>
          </button>
        </div>
        {/* User profile */}
        <div className="flex items-center p-4 border-b border-slate-800 relative z-10">
          <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
            <i className="fas fa-user text-white"></i>
          </div>
          {(isOpen || isMobile) && (
            <div className="ml-3 overflow-hidden">
              <div className="text-base font-medium truncate">{currentUser}</div>
              {roleNames.length > 0
                ? <div className="text-sm text-blue-300 truncate">{roleNames.join(', ')}</div>
                : <div className="text-sm text-blue-300 truncate">Unknown Role</div>
              }
            </div>
          )}
        </div>
        {/* Navigation */}
        <nav className="py-2 relative z-10">
          <ul>
            {filteredMenuItems.map(item => {
              // ACTUAL ONLY-ONE-HIGHLIGHT LOGIC HERE:
              const isActiveMain =
                (!item.submenu && location.pathname === item.path) ||
                (item.submenu && item.submenu.some(({ path }) => path === location.pathname));
              return (
                <li key={item.path} className="relative">
                  {item.submenu && item.submenu.length > 0 ? (
                    <>
                      <div
                        className={`flex items-center justify-between py-2.5 px-4 text-sm transition cursor-pointer
                          ${isActiveMain
                            ? 'bg-slate-800 border-l-4 border-blue-500'
                            : 'hover:bg-slate-800 border-l-4 border-transparent'}
                          `}
                        onClick={e => toggleSubmenu(item.path, e)}
                      >
                        <div className="flex items-center">
                          <div className={`text-center ${isOpen || isMobile ? 'w-6' : 'w-full'}`}>
                            <i className={`fas fa-${item.icon}`}></i>
                          </div>
                          {(isOpen || isMobile) && <span className="ml-2 truncate">{item.label}</span>}
                        </div>
                        {(isOpen || isMobile) && (
                          <i className={`fas fa-chevron-${expandedMenu === item.path ? 'down' : 'right'} text-xs`}></i>
                        )}
                      </div>
                      {expandedMenu === item.path && (isOpen || isMobile) && (
                        <ul className="pl-0 bg-slate-950 border-l-4 border-blue-500">
                          {item.submenu.map(subItem => (
                            <li key={subItem.path}>
                              <NavLink
                                to={subItem.path}
                                className={({ isActive }) => `
                                  flex items-center pl-12 py-2.5 pr-4 text-sm transition
                                  ${isActive ? 'bg-slate-900 text-blue-300' : 'text-gray-300 hover:bg-slate-800 hover:text-white'}
                                `}
                                onClick={() => {
                                  if (isMobile) toggleSidebar(false);
                                  resetExpandedMenus();
                                }}
                              >
                                <span className="truncate">{subItem.label}</span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <NavLink
                      to={item.path}
                      className={({ isActive }) => `
                        flex items-center py-2.5 px-4 text-sm transition
                        ${isActive ? 'bg-slate-800 border-l-4 border-blue-500'
                                  : 'hover:bg-slate-800 border-l-4 border-transparent'}
                      `}
                      onClick={() => {
                        if (isMobile) toggleSidebar(false);
                        resetExpandedMenus();
                      }}
                    >
                      <div className={`text-center ${isOpen || isMobile ? 'w-6' : 'w-full'}`}>
                        <i className={`fas fa-${item.icon}`}></i>
                      </div>
                      {(isOpen || isMobile) && <span className="ml-3 truncate">{item.label}</span>}
                    </NavLink>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
