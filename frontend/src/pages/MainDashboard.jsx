import React, { useEffect, useState } from "react";
import ClientDashboard from "./Dashboard";
//import HRStaffModuleComplete from "../components/HrDashboard";
import { DashboardContainer } from "../components/hr";
import EmployeeDashboard from "./hr/EmployeeDashboard";

const ROLES_API = "http://localhost:3005/api/roles?skip=0&limit=100";

export default function MainDashboard() {
  const [roleLabels, setRoleLabels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRolesAndUser = async () => {
      try {
        // 1. Get current user from localStorage
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.roles) {
          setRoleLabels([]);
          setLoading(false);
          return;
        }

        // 2. Fetch all roles from backend
        const token = localStorage.getItem("access_token");
        const res = await fetch(ROLES_API, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        const rolesData = await res.json(); // array of {id, name, ...}
        // 3. Map user assigned role IDs to label names
        const userRoleLabels = user.roles
          .map(roleId =>
            typeof roleId === "string"
              ? (rolesData.find(role => role.id === roleId)?.name.toLowerCase() || roleId.toLowerCase())
              : (roleId.name?.toLowerCase() || roleId.id?.toLowerCase())
          );
        setRoleLabels(userRoleLabels);
      } catch (e) {
        setRoleLabels([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRolesAndUser();
  }, []);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  const isAdmin =
    roleLabels.includes("admin") ||
    roleLabels.includes("administrator") ||
    roleLabels.includes("director");
  const isHR =
    roleLabels.includes("hr") ||
    roleLabels.includes("human resource");
  const isEmployee =
    roleLabels.includes("employee");

  if (isAdmin) return <ClientDashboard />;
  if (isHR) return <DashboardContainer />;
  if (isEmployee) return <EmployeeDashboard />;
  return <div>Unauthorized or no role profile assigned.</div>;
}
