import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TaskWorkflowManagement from "./TaskWorkflowManagement";
import EmployeeTaskView from "./EmployeeTaskView";

function TaskView() {
  const navigate = useNavigate();
  const [appRoles, setAppRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Only read userObj once
  const userObj = React.useMemo(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  // Redirect if not logged in or no user id
  useEffect(() => {
    if (!userObj || !userObj.user_id) {
      navigate("/login", { replace: true });
    }
  }, [userObj, navigate]);

  // Only fetch roles once after mount, if userObj is present
  useEffect(() => {
    let isMounted = true;
    async function fetchRoleNames() {
      if (!userObj || !Array.isArray(userObj.roles) || !userObj.roles.length) {
        if (isMounted) {
          setLoading(false);
          setAppRoles([]);
        }
        return;
      }
      try {
        const token = localStorage.getItem("access_token") || "";
        const fetches = userObj.roles.map(roleId =>
          fetch(`https://ratilalandsonscrm.onrender.com/api/roles/${roleId}`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(res => res.ok ? res.json() : null)
        );
        const results = await Promise.all(fetches);
        const names = results
          .map(r => r && r.name ? r.name.toLowerCase() : null)
          .filter(Boolean);
        if (isMounted) setAppRoles(names);
      } catch {
        if (isMounted) setAppRoles([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchRoleNames();
    return () => { isMounted = false; };
  }, [userObj]); // Only run when userObj from localStorage changes

  if (loading) return <div className="text-center py-32">Loading roles...</div>;
  if (!userObj || !userObj.user_id) return null;

  const canSeeTaskManagement = appRoles.includes("admin") || appRoles.includes("hr");
  const isEmployee = appRoles.includes("employee");

  if (canSeeTaskManagement) return <TaskWorkflowManagement />;
  if (isEmployee) return <EmployeeTaskView />;
  return <div className="text-center py-32">You do not have access to this page.</div>;
}

export default TaskView;
