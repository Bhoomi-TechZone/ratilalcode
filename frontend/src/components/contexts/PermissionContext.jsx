import React, { createContext, useContext, useState, useEffect } from "react";

const PermissionsContext = createContext();

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function PermissionsProvider({ children }) {
  const [userPermissions, setUserPermissions] = useState([]);
  const [currentUser, setCurrentUser] = useState("Unknown User");
  const [roleNames, setRoleNames] = useState([]);
  const [rolesList, setRolesList] = useState([]);

  // Expose refetch for manual triggers
  async function fetchUserAndPermissions() {
    try {
      // 1. Load roles
      let allRoles = [];
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("https://ratilalandsonscrm.onrender.com/api/roles/", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          allRoles = await res.json();
        }
      } catch {
        allRoles = [];
      }
      setRolesList(allRoles);

      // 2. Load user
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        setCurrentUser(userObj.full_name || userObj.username || "Unknown User");

        // IDs from userObj
        const roleIds =
          userObj.role_ids && userObj.role_ids.length > 0
            ? userObj.role_ids
            : Array.isArray(userObj.roles)
            ? userObj.roles
            : typeof userObj.roles === "string"
            ? [userObj.roles]
            : [];

        // Map IDs to names (but after rolesList is loaded)
        setRoleNames(
          Array.isArray(roleIds) && allRoles.length
            ? roleIds.map(id => allRoles.find(r => r.id === id)?.name || id)
            : []
        );
      } else {
        setCurrentUser("Unknown User");
        setRoleNames([]);
      }

      // 3. Get permissions
      const token = localStorage.getItem("access_token");
      if (token) {
        const res = await fetch("https://ratilalandsonscrm.onrender.com/api/permissions/my", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const permsData = await res.json();
          setUserPermissions(
            Array.isArray(permsData)
              ? permsData.map(p => typeof p === "string" ? p : p.code)
              : []
          );
        } else {
          setUserPermissions([]);
        }
      } else {
        setUserPermissions([]);
      }
    } catch {
      setUserPermissions([]);
      setCurrentUser("Unknown User");
      setRoleNames([]);
      setRolesList([]);
    }
  }

  // Keep role names synced with user/rolesList *any time either changes*.
  useEffect(() => {
    fetchUserAndPermissions();
    // Listen for storage and login/logout for live reload
    function handleStorage(evt) {
      if (["access_token", "user"].includes(evt.key)) fetchUserAndPermissions();
    }
    window.addEventListener("storage", handleStorage);

    function handleManual() {
      fetchUserAndPermissions();
    }
    window.addEventListener("login", handleManual);
    window.addEventListener("logout", handleManual);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("login", handleManual);
      window.removeEventListener("logout", handleManual);
    };
    // eslint-disable-next-line
  }, []);

  // Whenever rolesList or user changes, remap role names
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr && rolesList.length > 0) {
      const userObj = JSON.parse(userStr);
      const roleIds =
        userObj.role_ids && userObj.role_ids.length > 0
          ? userObj.role_ids
          : Array.isArray(userObj.roles)
          ? userObj.roles
          : typeof userObj.roles === "string"
          ? [userObj.roles]
          : [];
      setRoleNames(
        Array.isArray(roleIds)
          ? roleIds.map(id => rolesList.find(r => r.id === id)?.name || id)
          : []
      );
    }
  }, [rolesList]);

  // Attach to window for manual calls if ever needed
  window.PermissionsContextRefresh = fetchUserAndPermissions;

  return (
    <PermissionsContext.Provider value={{
      userPermissions,
      setUserPermissions,
      currentUser,
      setCurrentUser,
      roleNames,
      setRoleNames,
      rolesList,
      refetchPermissions: fetchUserAndPermissions
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}
