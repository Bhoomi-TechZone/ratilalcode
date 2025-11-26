import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Layout from './components/layout/Layout';
import UserProfiles from './pages/UserProfiles';
import RolesProfiles from './pages/RolesManagement';
import CRMPage from './pages/CRMPage';
import InventoryManagement from './pages/InventoryManagement';
import TaskView from './pages/TaskView';
import DocumentManagement from './pages/DocumentManagement';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Admin from './pages/Admin';
import EmployeeDetail from './pages/EmployeeDetail';
import LeaveRequestCard from './pages/LeaveRequestCard';
import HierarchyAssignment from './pages/HierarchyAssignment';
import AttendancePage from './pages/AttendancePage';
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import OrderSummary from "./pages/OrderSummary";
import AlertsManagement from './pages/AlertsManagement';
import SiteManagement from './pages/SiteManagement';
import GeneratorsUtilities from './pages/GeneratorManagement';
import EnergyReports from './pages/GenratorReports';
import CompaniesPage from './components/superadmin/CompaniesManagement';
import GlobalReports from './components/superadmin/GlobalReports';
import EmployeesPage from './pages/EmployeesPage_backup';
import EmployeeDashboard from './pages/hr/EmployeeDashboard';
import EmployeeDetails from './components/hr/EmployeeDetails';
import { AttendanceManagement } from './components/hr';
import MainDashboard from './pages/MainDashboard';
import EmployeeManagement from './components/hr/EmployeeManagement';
import UserAttendanceView from './components/hr/MyAttendancePage';


// Authentication hook
function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('access_token'); 
  });
  const [showRegister, setShowRegister] = useState(false);


  const login = () => setIsAuthenticated(true);
  const logout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
  }

  // Register also logs user in
  const register = () => {
    setIsAuthenticated(true);
    setShowRegister(false);
  };

  return {
    isAuthenticated,
    login,
    logout,
    showRegister,
    setShowRegister,
    register,
  };
}

// ProtectedRoute: Only shows children if logged in, otherwise redirects to login
function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// AuthGate: Handles login/register switching
function AuthGate({ isAuthenticated, login, showRegister, setShowRegister, register }) {
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return showRegister ? (
    <RegisterForm
      onRegister={register}
      onShowLogin={() => setShowRegister(false)}
    />
  ) : (
    <LoginForm
      onLogin={login}
      onShowRegister={() => setShowRegister(true)}
    />
  );
}

import { PermissionsProvider } from './components/contexts/PermissionContext.jsx';

function App() {
  const auth = useAuth();

  return (
    <PermissionsProvider> 
      <BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
        <Routes>
          {/* Auth routes */}
          <Route
            path="/login"
            element={
              <AuthGate
                isAuthenticated={auth.isAuthenticated}
                login={auth.login}
                showRegister={auth.showRegister}
                setShowRegister={auth.setShowRegister}
                register={auth.register}
              />
            }
          />
          {/* Default route: redirect to login if not authenticated */}
          <Route
            path="/"
            element={
              auth.isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          {/* Main app, only visible if logged in */}
          <Route
            element={
              <ProtectedRoute isAuthenticated={auth.isAuthenticated}>
                <Layout logout={auth.logout} />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<MainDashboard />} />
            <Route path="/users/list" element={<UserProfiles />} />
            <Route path="/users/roles" element={<RolesProfiles />} />
            {/* <Route path="/users/hierarchy" element={<UserHierarchyPage/>}/> */}
            <Route path="/customers" element={<CRMPage />} />
            <Route path="/hr/*" element={<EmployeeManagement />} />
            {/* <Route path="/hr/*" element={HRStaffModuleComplete /> } /> */}
            <Route path="/inventory/*" element={<InventoryManagement />} />
            {/* <Route path="/accounts/*" element={<AccountsFinance />} /> */}
            <Route path="/tasks" element={<TaskView />} />
            <Route path="/documents/*" element={<DocumentManagement />} />
            <Route path="/employee/:id" element={<EmployeeDetail />} />
            <Route path="/hierarchy-assignment" element={<HierarchyAssignment />} />
            <Route path="/leave-requests" element={<LeaveRequestCard />} />
            <Route path="/my-leave-requests" element={<LeaveRequestsPage />} />
            <Route path="/order-summary/:customerId" element={<OrderSummary />} />
            <Route path="/alerts" element={<AlertsManagement />} />
            <Route path="/site-management" element={<SiteManagement />} />
            <Route path="/generator-management" element={<GeneratorsUtilities />} />
            <Route path="/energy-reports" element={<EnergyReports />} />
            <Route path="/company-management" element={<CompaniesPage />} />
            <Route path="/global-reports" element={<GlobalReports />} />
            <Route path="/attendance" element={<AttendanceManagement />} />
            <Route path="/my-attendance" element={<UserAttendanceView />} />

          </Route>
          {/* 404 */}
          <Route path="*" element={
              <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
              </div>
            } />
        </Routes>
      </BrowserRouter>
    </PermissionsProvider> 
  );
}

export default App;
