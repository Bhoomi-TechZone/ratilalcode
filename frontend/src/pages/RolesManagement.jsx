// import React, { useEffect, useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { AddCustomerModal } from "../components/CRM/CustomerProfile";

// const API_URL = "http://localhost:3005/api/roles/";

// const ALL_PERMISSIONS = [
//   { key: "dashboard", label: "Dashboard" },
//   { key: "leads", label: "Leads & Sales" },
//   { key: "users", label: "Users" },
//   { key: "roles", label: "Roles" },
//   { key: "customers", label: "Customers" },
//   { key: "franchise", label: "Franchise Management" },
//   { key: "hr", label: "HR & Staff" },
//   { key: "inventory", label: "Inventory" },
//   { key: "accounts", label: "Accounts" },
//   { key: "tasks", label: "Tasks & Workflow" },
//   { key: "tickets", label: "Support Tickets" },
//   { key: "documents", label: "Documents" },
//   { key: "marketing", label: "Marketing" },
//   { key: "reports", label: "Reports" },
//   { key: "admin", label: "Admin" },
//   { key: "generator_management", label: "Generators & Utilities" },
//   { key: "site_management", label: "Site Management" },
//   { key: "alerts", label: "Alerts" }
// ];

// const modalVariants = {
//   hidden: { opacity: 0, scale: 0.92, y: 70 },
//   visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 340, damping: 30 } },
//   exit: { opacity: 0, scale: 0.95, y: 40, transition: { duration: 0.18 } }
// };

// const toastVariants = {
//   hidden: { opacity: 0, y: 40 },
//   visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
//   exit: { opacity: 0, y: 40, transition: { duration: 0.2 } }
// };

// const errorAnim = {
//   hidden: { opacity: 0, y: 10 },
//   visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 210, damping: 18 } },
//   exit: { opacity: 0, y: 10, transition: { duration: 0.2 } }
// };

// const tableRowVariants = {
//   hidden: { opacity: 0, x: -20 },
//   visible: (i) => ({
//     opacity: 1,
//     x: 0,
//     transition: { delay: i * 0.03, type: "spring", stiffness: 120, damping: 14 }
//   }),
//   exit: { opacity: 0, x: 20, transition: { duration: 0.16 } }
// };

// const RolePermissionsModal = ({ role, onClose, onSaved }) => {
//   const [permissions, setPermissions] = useState(role.permissions || []);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");
//   const [showSuccessModal, setShowSuccessModal] = useState(false);

//   const handlePermissionChange = permKey => {
//     setPermissions(perms =>
//       perms.includes(permKey)
//         ? perms.filter(p => p !== permKey)
//         : [...perms, permKey]
//     );
//   };

//   const handleSave = async () => {
//     setSaving(true);
//     setError("");
//     try {
//       if (!role.id) {
//         throw new Error("Role object missing 'id' field. Can't save permissions.");
//       }
//       const res = await fetch(`${API_URL}${role.id}`, {
//         method: "PUT",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`
//         },
//         body: JSON.stringify({ permissions }),
//       });
//       if (!res.ok) {
//         const errData = await res.json();
//         throw new Error(errData.detail || "Failed to save permissions");
//       }
      
//       // Show success modal instead of closing immediately
//       console.log("Permissions saved successfully, showing modal");
//       setTimeout(() => {
//         setShowSuccessModal(true);
//       }, 100); // Small delay to ensure proper rendering
      
//     } catch (err) {
//       console.error("Error saving permissions:", err);
//       setError(err.message || "Could not save permissions.");
//     }
//     setSaving(false);
//   };

//   const handleSuccessModalClose = () => {
//     setShowSuccessModal(false);
//     onSaved && onSaved();
//     onClose();
//   };

//   return (
//     <>
//       <motion.div
//         className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
//         initial="hidden"
//         animate="visible"
//         exit="exit"
//         variants={modalVariants}
//       >
//         <motion.div
//           className="bg-white rounded-2xl w-full max-w-xs sm:max-w-lg md:max-w-2xl p-4 sm:p-6 md:p-7 shadow-2xl relative border border-blue-200"
//           initial={{ scale: 0.85, opacity: 0, y: 50 }}
//           animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 230, damping: 20 } }}
//           exit={{ scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.18 } }}
//         >
//           <button
//             onClick={onClose}
//             className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500 font-bold"
//             aria-label="Close"
//           >×</button>
//           <h3 className="text-lg sm:text-xl font-bold mb-4 text-blue-800">Permissions for "{role.name}"</h3>
//           <div className="max-h-72 overflow-y-auto mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
//             {ALL_PERMISSIONS.map(perm => (
//               <label key={perm.key} className="flex items-center gap-2 text-sm font-medium text-gray-700">
//                 <input
//                   type="checkbox"
//                   checked={permissions.includes(perm.key)}
//                   onChange={() => handlePermissionChange(perm.key)}
//                 />
//                 <span>{perm.label}</span>
//               </label>
//             ))}
//           </div>
//           {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
//           <motion.button
//             className="w-full bg-blue-600 text-white font-semibold rounded-lg px-4 py-2 mt-3 shadow-sm hover:bg-blue-700"
//             onClick={handleSave}
//             disabled={saving}
//             whileHover={{ scale: 1.03 }}
//             whileTap={{ scale: 0.97 }}
//           >
//             {saving ? "Saving..." : "Save Permissions"}
//           </motion.button>
//         </motion.div>
//       </motion.div>

//       {/* Success Modal */}
//       <AnimatePresence>
//         {showSuccessModal && (
//           <motion.div
//             className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60"
//             initial="hidden"
//             animate="visible"
//             exit="exit"
//             variants={modalVariants}
//             key="success-modal"
//             style={{ zIndex: 9999 }}
//           >
//             <motion.div
//               className="bg-white rounded-2xl w-full max-w-xs sm:max-w-md p-4 sm:p-7 shadow-2xl relative text-center border border-green-200"
//               initial={{ scale: 0.85, opacity: 0, y: 50 }}
//               animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 230, damping: 20 } }}
//               exit={{ scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.18 } }}
//               style={{ zIndex: 10000 }}
//             >
//               <button
//                 onClick={handleSuccessModalClose}
//                 className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500 font-bold"
//                 aria-label="Close"
//               >×</button>
//               <div className="text-6xl mb-4 text-green-500">✅</div>
//               <h3 className="text-lg sm:text-xl font-bold mb-4 text-green-800">Success!</h3>
//               <h4 className="text-md font-semibold mb-2 text-gray-800">Permissions Saved Successfully</h4>
//               <p className="mb-6 text-gray-600 text-sm">
//                 Permissions for role <span className="font-semibold text-green-700">"{role.name}"</span> have been updated successfully.
//               </p>
//               <motion.button
//                 className="bg-gradient-to-r from-green-600 to-green-400 text-white rounded-lg px-6 py-2 font-semibold hover:from-green-700 hover:to-green-500 shadow-lg w-full sm:w-auto"
//                 onClick={handleSuccessModalClose}
//                 whileHover={{ scale: 1.04 }}
//                 whileTap={{ scale: 0.96 }}
//               >
//                 Great!
//               </motion.button>
//             </motion.div>
//           </motion.div>
//         )}                    
//       </AnimatePresence>
//     </>
//   );
// };

// function getIsAdmin() {
//   let userObj = null;
//   try {
//     const userStr = localStorage.getItem('user');
//     if (userStr) {
//       userObj = JSON.parse(userStr);
//     }
//   } catch {}
//   let roles = [];
//   if (userObj && userObj.roles) {
//     if (Array.isArray(userObj.roles)) {
//       roles = userObj.roles.map(r => typeof r === 'string' ? r.toLowerCase() : (r.name || r.id || "").toLowerCase());
//     } else if (typeof userObj.roles === 'string') {
//       if (userObj.roles.includes(',')) {
//         roles = userObj.roles.split(',').map(r => r.trim().toLowerCase());
//       } else {
//         roles = [userObj.roles.toLowerCase()];
//       }
//     }
//   }
//   return roles.includes('admin');
// }

// const RolesManagement = () => {
//   const [roles, setRoles] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [showCreate, setShowCreate] = useState(false);
//   const [newRoleName, setNewRoleName] = useState("");
//   const [newParentId, setNewParentId] = useState(""); // <-- Add state for parent role
//   const [deleteRole, setDeleteRole] = useState(null);
//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [toast, setToast] = useState({ show: false, message: "", type: "success" });
//   const [permRole, setPermRole] = useState(null);
//   const [showRoleExistsModal, setShowRoleExistsModal] = useState(false);
//   const [existingRoleName, setExistingRoleName] = useState("");

//   const isAdmin = getIsAdmin();

//   useEffect(() => {
//     fetchRoles();
//     // eslint-disable-next-line
//   }, []);

//   const showToast = (message, type = "success") => {
//     setToast({ show: true, message, type });
//     setTimeout(() => setToast({ show: false, message: "", type }), 2100);
//   };

//   const fetchRoles = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const res = await fetch(API_URL, {
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
//         },
//       });
//       if (!res.ok) throw new Error("Failed to fetch roles");
//       const data = await res.json();
//       setRoles(data);
//     } catch (err) {
//       setError("Could not load roles.");
//       setRoles([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreateRole = async (e) => {
//     e.preventDefault();
//     setSaving(true);
//     setError("");
//     const trimmedRoleName = newRoleName.trim();
//     try {
//       const payload = { name: trimmedRoleName };
//       // Send report_to (not parent_id) to match backend
//       if (newParentId) payload.report_to = newParentId;
//       const res = await fetch(API_URL, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
//         },
//         body: JSON.stringify(payload),
//       });

//       if (!res.ok) {
//         const errData = await res.json();
//         if (
//           res.status === 400 &&
//           errData &&
//           typeof errData.detail === "string" &&
//           errData.detail.toLowerCase().includes("already exists")
//         ) {
//           setExistingRoleName(trimmedRoleName);
//           setShowRoleExistsModal(true);
//           setSaving(false);
//           return;
//         }
//         throw new Error(errData.detail || "Failed to create role");
//       }

//       setShowCreate(false);
//       setNewRoleName("");
//       setNewParentId(""); // <-- Reset parent selection
//       setError("");
//       showToast("Role created successfully", "success");
//       fetchRoles();
//     } catch (err) {
//       setError(err.message || "Could not create role.");
//       showToast(err.message || "Could not create role.", "error");
//     }
//     setSaving(false);
//   };

//   const handleDeleteRole = async () => {
//     if (!deleteRole) return;
//     setSaving(true);
//     setError("");
//     try {
//       const res = await fetch(`${API_URL}${deleteRole.id}`, {
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
//         },
//       });
//       if (!res.ok) {
//         const errData = await res.json();
//         throw new Error(errData.detail || "Could not delete role");
//       }
//       setShowDeleteModal(false);
//       setDeleteRole(null);
//       fetchRoles();
//       showToast("Role deleted successfully", "success");
//     } catch (err) {
//       setError(err.message || "Could not delete role.");
//       showToast(err.message || "Could not delete role.", "error");
//     }
//     setSaving(false);
//   };

//   if (loading)
//     return (
//       <motion.div
//         className="fixed inset-0 flex items-center justify-center bg-white z-50"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//       >
//         <motion.div
//           className="text-center"
//           initial={{ scale: 0.85, opacity: 0 }}
//           animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 180, damping: 20 } }}
//         >
//           <div className="animate-spin mx-auto mb-4 rounded-full border-4 border-blue-400 border-t-transparent w-12 h-12" />
//           <div className="text-blue-600 font-bold text-lg">Loading roles...</div>
//         </motion.div>
//       </motion.div>
//     );
//   if (error)
//     return <div className="p-8 text-center text-red-600 font-semibold text-lg">{error}</div>;

//   return (
//     <div className="p-2 sm:p-3 md:p-7">
//       {/* Toast Message */}
//       <AnimatePresence>
//         {toast.show && (
//           <motion.div
//             className={`fixed top-6 left-1/2 z-50 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white font-semibold
//               ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
//             initial="hidden"
//             animate="visible"
//             exit="exit"
//             variants={toastVariants}
//           >
//             {toast.message}
//           </motion.div>
//         )}
//       </AnimatePresence>

//       <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 140, damping: 18 }}>
//         <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
//           <div className="w-full">
//             <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 tracking-tight drop-shadow text-center sm:text-left mb-2">Roles Management</h2>
//           </div>
//           <motion.button
//             whileHover={{ scale: 1.06 }}
//             whileTap={{ scale: 0.98 }}
//             className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-4 sm:px-6 py-2 rounded-lg shadow-md hover:from-blue-700 hover:to-blue-500 font-semibold transition w-full sm:w-auto"
//             onClick={() => {
//               setShowCreate(true);
//               setError("");
//             }}
//           >
//             + Create Role
//           </motion.button>
//         </div>

//         <AddCustomerModal onCreated={fetchRoles} />

//         <div className="overflow-x-auto bg-white rounded-2xl shadow-lg border border-gray-100 mb-8">
//           <table className="min-w-[350px] sm:min-w-[600px] md:min-w-[1000px] w-full text-xs sm:text-base">
//             <thead>
//               <tr className="bg-gradient-to-r from-blue-50 to-blue-100 text-left">
//                 <th className="p-2 sm:p-4 font-semibold text-blue-700">Role ID</th>
//                 <th className="p-2 sm:p-4 font-semibold text-blue-700">Role Name</th>
//                 <th className="p-2 sm:p-4 font-semibold text-blue-700">Reports To</th>
//                 <th className="p-2 sm:p-4 font-semibold text-blue-700">Created</th>
//                 <th className="p-2 sm:p-4 font-semibold text-blue-700">Actions</th>
//               </tr>
//             </thead>
//             <AnimatePresence>
//             <tbody>
//               {roles.map((role, i) => {
//                 // Find parent role name by id (support both parent_id and report_to)
//                 const parentId = role.parent_id || role.report_to;
//                 const parentRole = roles.find(r => r.id === parentId);
//                 return (
//                   <motion.tr
//                     key={role.id}
//                     variants={tableRowVariants}
//                     initial="hidden"
//                     animate="visible"
//                     exit="exit"
//                     custom={i}
//                     className="border-t hover:bg-blue-50 transition"
//                   >
//                     <td className="p-2 sm:p-4 text-xs sm:text-sm text-gray-700 font-mono break-all">{role.id}</td>
//                     <td className="p-2 sm:p-4 font-semibold capitalize break-all">{role.name}</td>
//                     <td className="p-2 sm:p-4 text-sm text-gray-600">
//                       {parentRole ? `${parentRole.name} (${parentRole.id})` : <span className="italic text-gray-400">None</span>}
//                     </td>
//                     <td className="p-2 sm:p-4 text-xs text-gray-500 break-all">
//                       {role.created_at ? new Date(role.created_at).toLocaleString() : ""}
//                     </td>
//                     <td className="p-2 sm:p-4 flex flex-col sm:flex-row flex-wrap gap-2">
//                       {(
//                         <motion.button
//                           whileHover={{ scale: 1.04 }}
//                           whileTap={{ scale: 0.96 }}
//                           className="px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white text-xs font-bold shadow transition"
//                           onClick={() => setPermRole(role)}
//                         >
//                           Set Permissions
//                         </motion.button>
//                       )}
//                       <motion.button
//                         whileHover={{ scale: 1.04 }}
//                         whileTap={{ scale: 0.96 }}
//                         className="px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-600 hover:text-white text-xs font-bold shadow transition"
//                         onClick={() => {
//                           setDeleteRole(role);
//                           setShowDeleteModal(true);
//                           setError("");
//                         }}
//                       >
//                         Delete
//                       </motion.button>
//                     </td>
//                   </motion.tr>
//                 );
//               })}
//               {roles.length === 0 && (
//                 <tr>
//                   <td colSpan="5" className="p-4 text-center text-gray-400">
//                     No roles found.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//             </AnimatePresence>
//           </table>
//         </div>
//       </motion.div>

//       {/* Create Role Modal */}
//       <AnimatePresence>
//         {showCreate && (
//           <motion.div
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
//             initial="hidden"
//             animate="visible"
//             exit="exit"
//             variants={modalVariants}
//             key="create-modal"
//           >
//             <motion.div
//               className="bg-white rounded-2xl w-full max-w-xs sm:max-w-md p-4 sm:p-7 shadow-2xl relative border border-blue-200"
//               initial={{ scale: 0.85, opacity: 0, y: 50 }}
//               animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 230, damping: 20 } }}
//               exit={{ scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.18 } }}
//             >
//               <button
//                 onClick={() => {
//                   setShowCreate(false);
//                   setError("");
//                   setNewParentId("");
//                 }}
//                 className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500 font-bold"
//                 aria-label="Close"
//               >×</button>
//               <h3 className="text-lg sm:text-xl font-bold mb-4 text-blue-800 text-center">Create New Role</h3>
//               <form onSubmit={handleCreateRole} className="space-y-4">
//                 <div>
//                   <label className="block text-sm mb-1 font-medium text-gray-700">Role Name</label>
//                   <input
//                     value={newRoleName}
//                     onChange={e => setNewRoleName(e.target.value)}
//                     className="border rounded-lg p-2 w-full"
//                     placeholder="e.g. sales, admin, manager"
//                     required
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-sm mb-1 font-medium text-gray-700">Senior Role (Optional)</label>
//                   <select
//                     value={newParentId}
//                     onChange={e => setNewParentId(e.target.value)}
//                     className="border rounded-lg p-2 w-full"
//                   >
//                     <option value="">-- No Senior Role --</option>
//                     {roles.map(role => (
//                       <option key={role.id} value={role.id}>
//                         {role.name} ({role.id})
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <AnimatePresence>
//                   {error && (
//                     <motion.div
//                       className="text-red-600 text-sm"
//                       initial="hidden"
//                       animate="visible"
//                       exit="exit"
//                       variants={errorAnim}
//                       key="create-error"
//                     >
//                       {error}
//                     </motion.div>
//                   )}
//                 </AnimatePresence>
//                 <motion.button
//                   type="submit"
//                   disabled={saving}
//                   className="w-full bg-gradient-to-r from-blue-600 to-blue-400 text-white font-semibold rounded-lg px-4 py-2 mt-2 shadow-sm hover:from-blue-700 hover:to-blue-500"
//                   whileHover={{ scale: 1.03 }}
//                   whileTap={{ scale: 0.97 }}
//                 >
//                   {saving ? "Saving..." : "Create Role"}
//                 </motion.button>
//               </form>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Delete Role Modal */}
//       <AnimatePresence>
//         {showDeleteModal && deleteRole && (
//           <motion.div
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
//             initial="hidden"
//             animate="visible"
//             exit="exit"
//             variants={modalVariants}
//             key="delete-modal"
//           >
//             <motion.div
//               className="bg-white rounded-2xl w-full max-w-xs sm:max-w-md p-4 sm:p-7 shadow-2xl relative text-center border border-red-200"
//               initial={{ scale: 0.85, opacity: 0, y: 50 }}
//               animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 230, damping: 20 } }}
//               exit={{ scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.18 } }}
//             >
//               <button
//                 onClick={() => {
//                   setShowDeleteModal(false);
//                   setDeleteRole(null);
//                   setError("");
//                 }}
//                 className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500 font-bold"
//                 aria-label="Close"
//               >×</button>
//               <div className="text-4xl mb-2 text-red-400 animate-pulse">⚠️</div>
//               <h3 className="text-lg sm:text-xl font-bold mb-4 text-red-800">Delete Role</h3>
//               <div className="mb-2 text-xs text-gray-600 break-all">
//                 Role ID: <span className="font-mono">{deleteRole.id}</span>
//               </div>
//               <p className="mb-6 text-gray-700">
//                 Are you sure you want to delete the role <span className="font-semibold">{deleteRole.name}</span>?
//               </p>
//               <AnimatePresence>
//                 {error && (
//                   <motion.div
//                     className="text-red-600 text-sm mb-2"
//                     initial="hidden"
//                     animate="visible"
//                     exit="exit"
//                     variants={errorAnim}
//                     key="delete-error"
//                   >
//                     {error}
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//               <div className="flex flex-col sm:flex-row gap-3 justify-center">
//                 <motion.button
//                   className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-semibold shadow w-full sm:w-auto"
//                   onClick={() => {
//                     setShowDeleteModal(false);
//                     setDeleteRole(null);
//                     setError("");
//                   }}
//                   disabled={saving}
//                   whileHover={{ scale: 1.04 }}
//                   whileTap={{ scale: 0.96 }}
//                 >
//                   Cancel
//                 </motion.button>
//                 <motion.button
//                   className="bg-red-600 text-white rounded-lg px-4 py-2 font-semibold hover:bg-red-700 shadow w-full sm:w-auto"
//                   onClick={handleDeleteRole}
//                   disabled={saving}
//                   whileHover={{ scale: 1.04 }}
//                   whileTap={{ scale: 0.96 }}
//                 >
//                   {saving ? "Deleting..." : "Delete"}
//                 </motion.button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Role Already Exists Modal */}
//       <AnimatePresence>
//         {showRoleExistsModal && (
//           <motion.div
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
//             initial="hidden"
//             animate="visible"
//             exit="exit"
//             variants={modalVariants}
//             key="role-exists-modal"
//           >
//             <motion.div
//               className="bg-white rounded-2xl w-full max-w-xs sm:max-w-md p-4 sm:p-7 shadow-2xl relative text-center border border-yellow-200"
//               initial={{ scale: 0.85, opacity: 0, y: 50 }}
//               animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 230, damping: 20 } }}
//               exit={{ scale: 0.95, opacity: 0, y: 20, transition: { duration: 0.18 } }}
//             >
//               <button
//                 onClick={() => {
//                   setShowRoleExistsModal(false);
//                   setExistingRoleName("");
//                 }}
//                 className="absolute top-2 right-3 text-2xl text-gray-400 hover:text-red-500 font-bold"
//                 aria-label="Close"
//               >×</button>
//               <div className="text-4xl mb-2 text-yellow-400">⚠️</div>
//               <h3 className="text-lg sm:text-xl font-bold mb-4 text-yellow-800">Role Already Exists</h3>
//               <p className="mb-6 text-gray-700">
//                 The role <span className="font-semibold text-yellow-700">"{existingRoleName}"</span> already exists in the system.
//               </p>
//               <p className="mb-6 text-sm text-gray-600">
//                 Please choose a different name for your new role.
//               </p>
//               <motion.button
//                 className="bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-lg px-6 py-2 font-semibold hover:from-blue-700 hover:to-blue-500 shadow w-full sm:w-auto"
//                 onClick={() => {
//                   setShowRoleExistsModal(false);
//                   setExistingRoleName("");
//                 }}
//                 whileHover={{ scale: 1.04 }}
//                 whileTap={{ scale: 0.96 }}
//               >
//                 OK, Got It
//               </motion.button>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Permissions Modal */}
//       {permRole && (
//         <RolePermissionsModal
//           role={permRole}
//           onClose={() => setPermRole(null)}
//           onSaved={fetchRoles}
//         />
//       )}
//     </div>
//   );
// };

// export default RolesManagement;


// import React, { useEffect, useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";

// // --- API Configuration ---
// const API_URL = "http://localhost:3005/api/roles/";

// // --- App Modules & CRUD ---
// const ALL_PERMISSIONS = [
//   { key: "dashboard", label: "Dashboard (View Summary)", icon: "📊" },
//   { key: "leads", label: "Leads & Sales (Manage Opportunities)", icon: "💰" },
//   { key: "users", label: "Users (View/Modify User List)", icon: "👥" },
//   { key: "roles", label: "Roles (Define Permissions)", icon: "🛡️" },
//   { key: "customers", label: "Customers (Manage Client Data)", icon: "🧑‍🤝‍🧑" },
//   { key: "franchise", label: "Franchise Management (Outlet Control)", icon: "🏪" },
//   { key: "hr", label: "HR & Staff (Staffing & Payroll)", icon: "💼" },
//   { key: "inventory", label: "Inventory (Stock Management)", icon: "📦" },
//   { key: "accounts", label: "Accounts (Billing & Finance)", icon: "🧾" },
//   { key: "tasks", label: "Tasks & Workflow (Assign/Track Work)", icon: "📝" },
//   { key: "tickets", label: "Support Tickets (Resolve Customer Issues)", icon: "📞" },
//   { key: "documents", label: "Documents (Access/Upload Files)", icon: "📄" },
//   { key: "marketing", label: "Marketing (Campaign Management)", icon: "📣" },
//   { key: "reports", label: "Reports (Generate & View Data)", icon: "📈" },
//   { key: "admin", label: "Admin (System Settings)", icon: "⚙️" }
// ];
// const CRUD_ACTIONS = [
//   { key: "create", label: "Create", icon: "➕" },
//   { key: "read", label: "Read", icon: "👁️" },
//   { key: "update", label: "Update", icon: "✍️" },
//   { key: "delete", label: "Delete", icon: "🗑️" }
// ];

// // --- Utility for admin detection
// function getIsAdmin() {
//   let userObj = null;
//   try { const userStr = localStorage.getItem('user');
//     if (userStr) userObj = JSON.parse(userStr);
//   } catch {}
//   let roles = [];
//   if (userObj && userObj.roles) {
//     if (Array.isArray(userObj.roles)) {
//       roles = userObj.roles.map(r => typeof r === 'string' ? r.toLowerCase() : (r.name || r.id || "").toLowerCase());
//     } else if (typeof userObj.roles === 'string') {
//       roles = userObj.roles.split(',').map(r => r.trim().toLowerCase());
//     }
//   }
//   return roles.includes('admin') || roles.includes('super-admin');
// }

// // --- Hierarchy role tree utility
// const buildRoleTree = (roles, parentId = null) =>
//   roles
//     .filter(role => {
//       const currentParentId = role.parent_id || role.report_to;
//       const isTopLevel = parentId === null && (!currentParentId || currentParentId === '');
//       return currentParentId === parentId || isTopLevel;
//     })
//     .map(role => ({
//       ...role,
//       children: buildRoleTree(roles, role.id)
//     }));

// const modalVariants = {
//   hidden: { opacity: 0, scale: 0.95, y: 30 },
//   visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
//   exit: { opacity: 0, scale: 0.98, y: 20, transition: { duration: 0.2 } }
// };
// const errorAnim = {
//   hidden: { opacity: 0, y: 10 },
//   visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 210, damping: 18 } },
//   exit: { opacity: 0, y: 10, transition: { duration: 0.2 } }
// };

// // --- Modal: Module CRUD Permissions (Expanded on Click)
// const RolePermissionsModal = ({ role, onClose, onSaved }) => {
//   const [expanded, setExpanded] = useState(null);
//   const [permissions, setPermissions] = useState(() =>
//     (role.permissions || []).reduce((acc, key) => { acc[key] = true; return acc; }, {})
//   );
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");
//   const isAdminRole = role.name.toLowerCase().includes("admin");

//   const handleModuleClick = modKey => setExpanded(expanded === modKey ? null : modKey);

//   const handleCheck = (mod, act) =>
//     setPermissions(prev => ({
//       ...prev,
//       [`${mod}_${act}`]: !prev[`${mod}_${act}`]
//     }));

//   const handleSave = async () => {
//     setSaving(true); setError("");
//     try {
//       let perms = Object.entries(permissions).filter(([_, v]) => v).map(([k]) => k);
//       if (isAdminRole && !perms.includes("admin")) perms.push("admin");
//       await fetch(`${API_URL}${role.id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")||""}` },
//         body: JSON.stringify({ permissions: perms })
//       }).then(res => { if (!res.ok) throw new Error("Failed to save permissions"); });
//       onSaved && onSaved();
//       onClose();
//     } catch (err) { setError(err.message || "Failed to save permissions"); }
//     setSaving(false);
//   };

//   return (
//     <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30"
//       initial="hidden" animate="visible" exit="exit" variants={modalVariants}>
//       <motion.div className="bg-white rounded-2xl p-7 max-w-2xl w-full shadow-2xl border-t-8 border-purple-600 relative">
//         <button onClick={onClose} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-red-500 font-bold">×</button>
//         <div className="text-2xl font-black mb-6 text-purple-700 flex items-center gap-3"><span>🔑</span>{`Set Permissions for "${role.name}"`}</div>
//         <div className="divide-y divide-indigo-50 border rounded-xl shadow-inner bg-indigo-50 mb-6">
//           {ALL_PERMISSIONS.map(mod => (
//             <div key={mod.key} className="p-0 transition">
//               <button
//                 onClick={() => handleModuleClick(mod.key)}
//                 className={`flex justify-between items-center w-full px-4 py-3 rounded-lg text-left hover:bg-indigo-100 font-semibold text-lg transition ${expanded === mod.key ? "bg-indigo-100" : ""}`}>
//                 <span className="flex items-center gap-2"><span>{mod.icon}</span>{mod.label}</span>
//                 <span className={`ml-4 transition-transform duration-200 ${expanded === mod.key ? "rotate-90" : ""}`}>{">"}</span>
//               </button>
//               <AnimatePresence>
//                 {expanded === mod.key && (
//                   <motion.div
//                     initial={{ height: 0, opacity: 0 }}
//                     animate={{ height: "auto", opacity: 1 }}
//                     exit={{ height: 0, opacity: 0 }}
//                     className="pl-7 pb-3 pt-1 flex gap-6"
//                   >
//                     {CRUD_ACTIONS.map(act =>
//                       <label key={act.key} className="flex flex-col items-center mt-2 text-md font-semibold">
//                         <input
//                           className="accent-indigo-600 h-6 w-6"
//                           type="checkbox"
//                           checked={permissions[`${mod.key}_${act.key}`] || false}
//                           onChange={() => handleCheck(mod.key, act.key)}
//                         />
//                         <span className="mt-2 flex flex-col items-center">{act.icon}<span className="text-xs">{act.label}</span></span>
//                       </label>
//                     )}
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           ))}
//         </div>
//         {error && <div className="text-red-500 mb-4">{error}</div>}
//         <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-lg py-3 hover:from-purple-700 hover:to-indigo-700"
//           onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Permissions"}</button>
//       </motion.div>
//     </motion.div>
//   );
// };

// // --- Render tree node for hierarchy
// const RoleNode = ({ role, depth, onSetPermissions, onDeleteRole, allRoles }) => {
//   const [isExpanded, setIsExpanded] = useState(false);
//   const parentId = role.parent_id || role.report_to;
//   const parentRole = allRoles.find(r => r.id === parentId);
//   const parentName = parentRole ? parentRole.name : 'None (Top Level)';
//   const hasChildren = role.children && role.children.length > 0;
//   const getDepthColor = d => ['border-purple-600', 'border-teal-500', 'border-amber-500', 'border-indigo-500', 'border-pink-500'][d % 5];
//   const paddingClass = depth === 0 ? "p-4" : "p-3";
//   const indentStyle = { marginLeft: `${depth * 30}px`, width: depth === 0 ? '100%' : `calc(100% - ${depth * 30}px)` };
//   return (
//     <AnimatePresence>
//       <motion.div className={`flex flex-col mb-3 rounded-xl shadow-lg bg-white border-l-4 ${getDepthColor(depth)} transition-all duration-300 hover:shadow-xl hover:scale-[1.005]`} style={{ ...indentStyle }} layout>
//         <div className={`grid grid-cols-5 sm:grid-cols-6 items-center w-full ${paddingClass}`}>
//           <div className="flex items-center gap-4 col-span-3 sm:col-span-4">
//             {hasChildren ? (
//               <motion.button onClick={() => setIsExpanded(!isExpanded)}
//                 className="text-gray-600 hover:text-purple-700 transition p-2 rounded-full bg-purple-50 hover:bg-purple-200 border border-purple-300 flex-shrink-0"
//                 whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} aria-expanded={isExpanded}
//                 aria-controls={`children-${role.id}`}>
//                 <svg className={`w-4 h-4 transform ${isExpanded ? 'rotate-90' : 'rotate-0'} transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
//               </motion.button>
//             ) : (<div className="w-8 h-8 ml-1 flex-shrink-0 flex items-center justify-center text-sm text-gray-400"><span className="text-lg">○</span></div>)}
//             <div className="flex flex-col overflow-hidden">
//               <h4 className="text-lg font-extrabold capitalize text-purple-900 flex items-center gap-2">
//                 {role.name}
//                 {role.name.toLowerCase() === 'super-admin' && <span className="text-xs bg-red-700 text-white px-2 py-0.5 rounded-full font-mono shadow-md">ROOT ADMIN</span>}
//               </h4>
//               <p className="text-sm text-gray-500 mt-0.5 truncate flex items-center gap-1">
//                 <span className="text-indigo-500 font-bold">↑</span>
//                 Parent Role: <span className="font-semibold capitalize text-gray-700">{parentName}</span>
//               </p>
//             </div>
//           </div>
//           <div className="flex gap-2 justify-end col-span-2 sm:col-span-2">
//             <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
//               className="w-[125px] px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white text-sm font-bold shadow-md hover:shadow-indigo-300/50 transition duration-150"
//               onClick={() => onSetPermissions(role)}>📝 Set Permissions</motion.button>
//             {(role.name.toLowerCase() !== 'super-admin' && role.name.toLowerCase() !== 'admin') && (
//               <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
//                 className="w-[110px] px-3 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-600 hover:text-white text-sm font-bold shadow-md hover:shadow-red-300/50 transition duration-150"
//                 onClick={() => onDeleteRole(role)}>🗑️ Delete Role</motion.button>
//             )}
//           </div>
//         </div>
//         <AnimatePresence>
//           {hasChildren && isExpanded && (
//             <motion.div id={`children-${role.id}`} className="mt-1 pb-1"
//               initial={{ opacity: 0, height: 0 }}
//               animate={{ opacity: 1, height: 'auto', transition: { duration: 0.3 } }}
//               exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}>
//               {role.children.map(childRole => (
//                 <RoleNode key={childRole.id} role={childRole} depth={depth + 1}
//                   onSetPermissions={onSetPermissions} onDeleteRole={onDeleteRole} allRoles={allRoles} />
//               ))}
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </motion.div>
//     </AnimatePresence>
//   );
// };

// // --- Main Manager
// const RoleHierarchyManager = () => {
//   const [roles, setRoles] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [showCreate, setShowCreate] = useState(false);
//   const [newRoleName, setNewRoleName] = useState("");
//   const [newParentId, setNewParentId] = useState("");
//   const [deleteRole, setDeleteRole] = useState(null);
//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const [toast, setToast] = useState({ show: false, message: "", type: "success" });
//   const [permRole, setPermRole] = useState(null);
//   const [showRoleExistsModal, setShowRoleExistsModal] = useState(false);
//   const [existingRoleName, setExistingRoleName] = useState("");
//   useEffect(() => { fetchRoles(); }, []);
//   const showToast = (message, type = "success") => {
//     setToast({ show: true, message, type });
//     setTimeout(() => setToast({ show: false, message: "", type }), 2500);
//   };
//   const fetchRoles = async () => {
//     setLoading(true); setError("");
//     try {
//       const res = await fetch(API_URL, { headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` }, });
//       if (!res.ok) throw new Error("Failed to fetch roles");
//       const data = await res.json(); setRoles(data);
//     } catch (err) {
//       setError("Could not load roles. Please check your network or API status."); setRoles([]);
//     } finally { setLoading(false); }
//   };
//   const handleCreateRole = async (e) => {
//     e.preventDefault(); setSaving(true); setError("");
//     const trimmedRoleName = newRoleName.trim();
//     if (!trimmedRoleName) { setError("Role name cannot be empty."); setSaving(false); return; }
//     try {
//       const payload = { name: trimmedRoleName };
//       if (newParentId) payload.report_to = newParentId;
//       const res = await fetch(API_URL, {
//         method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
//         body: JSON.stringify(payload),
//       });
//       if (!res.ok) {
//         const errData = await res.json();
//         if (res.status === 400 && typeof errData.detail === "string" && errData.detail.toLowerCase().includes("already exists")) {
//           setExistingRoleName(trimmedRoleName); setShowRoleExistsModal(true); setSaving(false); return;
//         }
//         throw new Error(errData.detail || "Failed to create role");
//       }
//       setShowCreate(false); setNewRoleName(""); setNewParentId(""); setError(""); showToast("Role created successfully", "success"); fetchRoles();
//     } catch (err) {
//       setError(err.message || "Could not create role."); showToast(err.message || "Could not create role.", "error");
//     } setSaving(false);
//   };
//   const handleDeleteRole = async () => {
//     if (!deleteRole) return; setSaving(true); setError("");
//     try {
//       const res = await fetch(`${API_URL}${deleteRole.id}`, {
//         method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` }
//       });
//       if (!res.ok) {
//         const errData = await res.json();
//         throw new Error(errData.detail || "Could not delete role");
//       }
//       setShowDeleteModal(false); setDeleteRole(null); fetchRoles(); showToast("Role deleted successfully", "success");
//     } catch (err) {
//       setError(err.message || "Could not delete role. Ensure no users report to this role."); showToast(err.message || "Could not delete role.", "error");
//     } setSaving(false);
//   };

//   const roleTree = buildRoleTree(roles);

//   if (loading)
//     return <div className="p-12 text-center text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-xl font-semibold text-lg max-w-lg mx-auto mt-10">Loading Role Hierarchy...</div>;
//   if (error && !toast.show)
//     return <div className="p-12 text-center text-red-700 bg-red-100 border border-red-400 rounded-xl font-semibold text-lg max-w-lg mx-auto mt-10">Error: {error}</div>;

//   return (
//     <div className="p-4 sm:p-7 bg-gray-50 min-h-screen">
//       {/* Toast Message */}
//       <AnimatePresence>
//         {toast.show && (
//           <motion.div className={`fixed top-4 right-4 z-[9999] p-4 pr-6 rounded-xl shadow-2xl font-bold text-white transition-all flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}
//               initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 100 }}>
//               {toast.type === 'success' ? '👍' : '🚨'} {toast.message}
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {/* Top Title and Create Button */}
//       <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 140, damping: 18 }}>
//         <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-4 border-b-4 border-purple-300">
//           <h2 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-800 to-indigo-600 tracking-tight drop-shadow-lg">
//             Role Hierarchy Management 🛠️
//           </h2>
//           <motion.button whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(99, 102, 241, 0.4)" }} whileTap={{ scale: 0.98 }}
//             className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white px-8 py-3 rounded-xl shadow-lg font-extrabold transition duration-200 w-full sm:w-auto mt-4 sm:mt-0 text-lg border-b-4 border-indigo-700 hover:border-b-indigo-500"
//             onClick={() => { setShowCreate(true); setError(""); setNewParentId(""); }}>
//             ➕ Create New Role
//           </motion.button>
//         </header>
//         <section className="bg-white p-7 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-cyan-200">
//           <h3 className="text-2xl font-bold mb-5 text-purple-800 border-b pb-2 flex items-center gap-2">
//             <span className="text-xl text-teal-500">🌲</span> Current Organizational Chart
//           </h3>
//           {roleTree.length > 0 ? (
//             <div className="p-2">
//               <div className="grid grid-cols-5 sm:grid-cols-6 font-extrabold text-sm text-gray-700 bg-gray-100 rounded-lg py-3 mb-4 px-4 shadow-inner">
//                 <div className="col-span-3 sm:col-span-4 flex items-center gap-2"><span className="text-base text-purple-600">👥</span> Role Name & Parent</div>
//                 <div className="col-span-2 sm:col-span-2 text-right">Actions</div>
//               </div>
//               <AnimatePresence>
//                 {roleTree.map(role => (
//                   <RoleNode key={role.id} role={role} depth={0} onSetPermissions={setPermRole} onDeleteRole={role => { setDeleteRole(role); setShowDeleteModal(true); }} allRoles={roles} />
//                 ))}
//               </AnimatePresence>
//             </div>
//           ) : (
//             <p className="text-center p-10 text-gray-500 text-lg bg-gray-50 rounded-xl border border-dashed border-gray-300">No roles found. Start by creating the top-level role!</p>
//           )}
//         </section>
//       </motion.div>

//       {/* --- Modals --- */}
//       {/* Create Role Modal */}
//       <AnimatePresence>
//         {showCreate && (
//           <motion.div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-30"
//             initial="hidden" animate="visible" exit="exit" variants={modalVariants}>
//             <motion.form onSubmit={handleCreateRole} className="bg-white rounded-3xl w-full max-w-md p-8 shadow-lg relative border-t-8 border-purple-500"
//               initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 230, damping: 20 } }} exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.18 } }}>
//               <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-3xl text-gray-400 hover:text-red-500 font-light">
//                 <span className="block w-8 h-8 rounded-full bg-gray-100 hover:bg-red-500 hover:text-white flex items-center justify-center">&times;</span>
//               </button>
//               <h3 className="text-2xl font-bold mb-5 text-purple-900 border-b pb-2 flex items-center gap-2">
//                 <span className="text-purple-600 text-3xl">✨</span> Define New Role
//               </h3>
//               <div className="mb-4">
//                 <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="roleName">Role Name:</label>
//                 <input id="roleName" type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
//                   className="w-full p-3 border border-cyan-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition shadow-sm"
//                   placeholder="Enter role name" required />
//               </div>
//               <div className="mb-6">
//                 <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="parentRole">Reports To (Select Upper Person):</label>
//                 <select id="parentRole" value={newParentId} onChange={e => setNewParentId(e.target.value)}
//                   className="w-full p-3 border border-cyan-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white transition shadow-sm">
//                   <option value="">-- No Parent (Top Level / CEO) --</option>
//                   {roles.filter(r => r.name.toLowerCase() !== 'super-admin').map(role => (
//                     <option key={role.id} value={role.id}>{role.name}</option>
//                   ))}
//                 </select>
//               </div>
//               {error && <motion.div className="text-red-600 text-sm mb-4 p-2 bg-red-50 border border-red-300 rounded-lg" initial="hidden" animate="visible" exit="exit" variants={errorAnim}>{error}</motion.div>}
//               <motion.button type="submit"
//                 className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold rounded-xl px-4 py-3 shadow-xl hover:shadow-purple-400/50 hover:from-purple-700 hover:to-indigo-700 transition duration-200 text-lg"
//                 disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
//                 {saving ? "Creating Role..." : "Create Role"}
//               </motion.button>
//             </motion.form>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {/* Delete Role Modal */}
//       <AnimatePresence>
//         {showDeleteModal && deleteRole && (
//           <motion.div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-30"
//             initial="hidden" animate="visible" exit="exit" variants={modalVariants}>
//             <motion.div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-lg relative text-center border-t-8 border-red-500"
//               initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 230, damping: 20 } }} exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.18 } }}>
//               <div className="text-6xl mb-4 text-red-500">⚠️</div>
//               <h3 className="text-2xl font-bold mb-3 text-red-800">Confirm Deletion</h3>
//               <p className="mb-6 text-gray-600 text-md">
//                 Are you sure you want to delete the role: <span className="font-bold capitalize text-red-700 text-lg">"{deleteRole.name}"</span>?
//                 <br /> This action is <b>permanent</b> and cannot be undone.
//               </p>
//               {error && <motion.div className="text-red-600 text-sm mb-4 p-2 bg-red-50 border border-red-300 rounded-lg" initial="hidden" animate="visible" exit="exit" variants={errorAnim}>{error}</motion.div>}
//               <div className="flex gap-3 mt-4">
//                 <motion.button className="flex-1 bg-gray-200 text-gray-700 font-bold rounded-xl px-4 py-3 hover:bg-gray-300 transition shadow-md"
//                   onClick={() => setShowDeleteModal(false)} disabled={saving}
//                   whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>Cancel</motion.button>
//                 <motion.button className="flex-1 bg-red-600 text-white font-bold rounded-xl px-4 py-3 hover:bg-red-700 transition shadow-lg hover:shadow-red-400/50"
//                   onClick={handleDeleteRole} disabled={saving}
//                   whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>{saving ? "Deleting..." : "Yes, Delete Role"}</motion.button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {/* Role Exists Modal */}
//       <AnimatePresence>
//         {showRoleExistsModal && (
//           <motion.div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-30"
//             initial="hidden" animate="visible" exit="exit" variants={modalVariants}>
//             <motion.div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-lg relative text-center border-t-8 border-yellow-500"
//               initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 230, damping: 20 } }} exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.18 } }}>
//               <div className="text-6xl mb-4 text-yellow-500">⚠️</div>
//               <h3 className="text-2xl font-bold mb-3 text-yellow-800">Role Already Exists</h3>
//               <p className="mb-6 text-gray-600 text-md">
//                 A role named <span className="font-bold capitalize text-yellow-700 text-lg">"{existingRoleName}"</span> already exists in the system. Please choose a different, unique name.
//               </p>
//               <motion.button className="w-full bg-yellow-600 text-white font-bold rounded-xl px-4 py-3 hover:bg-yellow-700 transition shadow-lg hover:shadow-yellow-400/50"
//                 onClick={() => setShowRoleExistsModal(false)}
//                 whileHover={{ scale: 1.03 }}
//                 whileTap={{ scale: 0.97 }}>
//                 Got It
//               </motion.button>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//       {/* Permissions Modal */}
//       <AnimatePresence>
//         {permRole && (
//           <RolePermissionsModal
//             role={permRole}
//             onClose={() => setPermRole(null)}
//             onSaved={fetchRoles}
//           />
//         )}
//       </AnimatePresence>
//     </div>
//   );
// };

// export default RoleHierarchyManager;


import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- API Configuration ---
const API_URL = "http://localhost:3005/api/roles/";

// --- App Modules & CRUD ---
const ALL_PERMISSIONS = [
  { key: "dashboard", label: "Dashboard (View Summary)", icon: "📊" },
  { key: "leads", label: "Leads & Sales (Manage Opportunities)", icon: "💰" },
  { key: "users", label: "Users (View/Modify User List)", icon: "👥" },
  { key: "roles", label: "Roles (Define Permissions)", icon: "🛡️" },
  { key: "customers", label: "Customers (Manage Client Data)", icon: "🧑‍🤝‍🧑" },
  { key: "company_management", label: "Companies Management (Multi-Company)", icon: "🏢" }, // ⬅️ Added
  { key: "global_reports", label: "Global Reports (Company Analytics)", icon: "🌐" },      // ⬅️ Added
  { key: "franchise", label: "Franchise Management (Outlet Control)", icon: "🏪" },
  { key: "hr", label: "HR & Staff (Staffing & Payroll)", icon: "💼" },
  { key: "inventory", label: "Inventory (Stock Management)", icon: "📦" },
  { key: "accounts", label: "Accounts (Billing & Finance)", icon: "🧾" },
  { key: "tasks", label: "Tasks & Workflow (Assign/Track Work)", icon: "📝" },
  { key: "tickets", label: "Support Tickets (Resolve Customer Issues)", icon: "📞" },
  { key: "documents", label: "Documents (Access/Upload Files)", icon: "📄" },
  { key: "marketing", label: "Marketing (Campaign Management)", icon: "📣" },
  { key: "reports", label: "Reports (Generate & View Data)", icon: "📈" },
  { key: "admin", label: "Admin (System Settings)", icon: "⚙️" },
];

const CRUD_ACTIONS = [
  { key: "create", label: "Create", icon: "➕" },
  { key: "read", label: "Read", icon: "👁️" },
  { key: "update", label: "Update", icon: "✍️" },
  { key: "delete", label: "Delete", icon: "🗑️" }
];

// --- Utility for admin detection
function getIsAdmin() {
  let userObj = null;
  try { const userStr = localStorage.getItem('user');
    if (userStr) userObj = JSON.parse(userStr);
  } catch {}
  let roles = [];
  if (userObj && userObj.roles) {
    if (Array.isArray(userObj.roles)) {
      roles = userObj.roles.map(r => typeof r === 'string' ? r.toLowerCase() : (r.name || r.id || "").toLowerCase());
    } else if (typeof userObj.roles === 'string') {
      roles = userObj.roles.split(',').map(r => r.trim().toLowerCase());
    }
  }
  return roles.includes('admin') || roles.includes('super-admin');
}

// --- Hierarchy role tree utility
const buildRoleTree = (roles, parentId = null) =>
  roles
    .filter(role => {
      const currentParentId = role.parent_id || role.report_to;
      const isTopLevel = parentId === null && (!currentParentId || currentParentId === '');
      return currentParentId === parentId || isTopLevel;
    })
    .map(role => ({
      ...role,
      children: buildRoleTree(roles, role.id)
    }));

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { opacity: 0, scale: 0.98, y: 20, transition: { duration: 0.2 } }
};
const errorAnim = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 210, damping: 18 } },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } }
};

// --- Modal: Module CRUD Permissions (Expanded on Click, Responsive)
const RolePermissionsModal = ({ role, onClose, onSaved }) => {
  const [expanded, setExpanded] = useState(null);
  const [permissions, setPermissions] = useState(() =>
    (role.permissions || []).reduce((acc, key) => { acc[key] = true; return acc; }, {})
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isAdminRole = role.name.toLowerCase().includes("admin");

  const handleModuleAccess = (modKey) => {
    setPermissions(prev => ({
      ...prev,
      [modKey]: !prev[modKey]
    }));
  };

  const handleCheck = (mod, act) =>
    setPermissions(prev => ({
      ...prev,
      [`${mod}_${act}`]: !prev[`${mod}_${act}`]
    }));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      let perms = Object.entries(permissions).filter(([_, v]) => v).map(([k]) => k);
      if (isAdminRole && !perms.includes("admin")) perms.push("admin");
      await fetch(`${API_URL}${role.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token")||""}` },
        body: JSON.stringify({ permissions: perms })
      }).then(res => { if (!res.ok) throw new Error("Failed to save permissions"); });
      onSaved && onSaved();
      onClose();
    } catch (err) { setError(err.message || "Failed to save permissions"); }
    setSaving(false);
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 md:overflow-y-auto"
      initial="hidden" animate="visible" exit="exit" variants={modalVariants}>
      <motion.div className="bg-white rounded-t-3xl md:rounded-2xl p-4 sm:p-8 max-w-xs sm:max-w-lg md:max-w-2xl w-full shadow-2xl border-t-8 border-purple-600 relative flex flex-col"
        style={{ maxHeight: "95vh" }}>
        <button onClick={onClose} className="absolute top-5 right-5 text-xl sm:text-2xl text-gray-400 hover:text-red-500 font-bold z-10">×</button>
        <div className="text-xl sm:text-2xl font-black mb-4 text-purple-700 flex items-center gap-2 sm:gap-4 mt-2">
          <span>🔑</span>
          <span className="truncate">{`Set Permissions for "${role.name}"`}</span>
        </div>
        <div className="divide-y divide-indigo-100 border rounded-xl shadow-inner bg-indigo-50 mb-5 overflow-y-auto" style={{maxHeight:"54vh"}}>
          {ALL_PERMISSIONS.map(mod => (
            <div key={mod.key} className="flex flex-col">
              <button
                onClick={() => setExpanded(expanded === mod.key ? null : mod.key)}
                className={`flex items-center justify-between px-2 sm:px-4 py-3 rounded-xl text-left font-semibold text-base sm:text-lg transition 
                  ${expanded === mod.key ? "bg-indigo-100" : "hover:bg-indigo-50"}
                `}
                style={{ minHeight: 58 }}>
                <span className="flex items-center gap-2 text-sm sm:text-lg font-bold"><span>{mod.icon}</span>{mod.label}</span>
                <span className={`ml-4 transition-transform duration-200 ${expanded === mod.key ? "rotate-90" : ""}`}>{">"}</span>
              </button>
              <AnimatePresence>
                {expanded === mod.key && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="pl-3 sm:pl-7 pt-1 pb-4"
                  >
                    {/* MODULE ACCESS ROW */}
                    <div className="mb-2 flex items-center">
                      <label className="flex flex-row items-center gap-2 px-2 bg-indigo-50 rounded shadow border-indigo-200 border py-2">
                        <input
                          type="checkbox"
                          className="accent-purple-600 h-5 w-5"
                          checked={permissions[mod.key] || false}
                          onChange={() => handleModuleAccess(mod.key)}
                        />
                        <span className="text-[1rem] font-semibold text-indigo-600">Allow module access</span>
                      </label>
                    </div>
                    {/* CRUD GRID */}
                    <div className="grid grid-cols-4 gap-y-2 gap-x-4 mt-1 mb-1 w-full">
                      {CRUD_ACTIONS.map(act =>
                        <label
                          key={act.key}
                          className="flex flex-col items-center justify-center py-2 px-2 h-[58px] w-[68px] rounded-md bg-white border
                            border-gray-200 shadow-sm hover:shadow-md hover:border-purple-400 
                            transition focus-within:ring-2 focus-within:ring-purple-500 group cursor-pointer"
                          style={{
                            boxShadow: "0 1px 2px rgba(60,25,110,0.08)",
                            fontSize: "0.9rem"
                          }}
                        >
                          <input
                            className="sr-only peer"
                            type="checkbox"
                            checked={permissions[`${mod.key}_${act.key}`] || false}
                            onChange={() => handleCheck(mod.key, act.key)}
                          />
                          <span className={`flex items-center justify-center text-[1.2rem] mb-0.5 transition group-hover:text-purple-700 
                            ${permissions[`${mod.key}_${act.key}`] ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                            {act.icon}
                          </span>
                          <span className={`text-[0.95em] font-medium transition 
                            ${permissions[`${mod.key}_${act.key}`] ? 'text-purple-700' : 'text-gray-500'}`}>
                            {act.label}
                          </span>
                          {/* Custom visible checkbox */}
                          <span
                            className={`mt-1 w-4 h-4 rounded transition
                              border border-gray-300 group-hover:border-purple-400
                              ${permissions[`${mod.key}_${act.key}`] ? 'bg-purple-500 border-purple-700' : 'bg-gray-100'}
                            `}
                            style={{
                              display:'inline-block',
                              boxShadow: permissions[`${mod.key}_${act.key}`] ? '0 2px 6px rgba(120,78,235,0.21)' : 'none'
                            }}
                          >
                            {permissions[`${mod.key}_${act.key}`] && (
                              <svg className="w-4 h-4 text-white block" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                        </label>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl text-base sm:text-lg py-3 mt-1 hover:from-purple-700 hover:to-indigo-700 transition"
          onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Permissions"}</button>
      </motion.div>
    </motion.div>
  );
};

// --- Render tree node for hierarchy
const RoleNode = ({ role, depth, onSetPermissions, onDeleteRole, allRoles }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const parentId = role.parent_id || role.report_to;
  const parentRole = allRoles.find(r => r.id === parentId);
  const parentName = parentRole ? parentRole.name : 'None (Top Level)';
  const hasChildren = role.children && role.children.length > 0;
  const getDepthColor = d => ['border-purple-600', 'border-teal-500', 'border-amber-500', 'border-indigo-500', 'border-pink-500'][d % 5];
  const paddingClass = depth === 0 ? "p-4" : "p-3";
  const indentStyle = { marginLeft: `${depth * 16}px`, width: '100%', minWidth: "265px" };
  return (
    <AnimatePresence>
      <motion.div className={`flex flex-col mb-3 rounded-xl shadow-lg bg-white border-l-4 ${getDepthColor(depth)} transition-all duration-300 hover:shadow-xl hover:scale-[1.0125]`} style={indentStyle} layout>
        <div className={`grid grid-cols-4 sm:grid-cols-6 items-center w-full gap-x-2 gap-y-1 ${paddingClass}`}>
          <div className="col-span-3 sm:col-span-4 flex items-center gap-3 min-w-[165px]">
            {hasChildren ? (
              <motion.button onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-600 hover:text-purple-700 transition p-2 rounded-full bg-purple-50 hover:bg-purple-200 border border-purple-300 flex-shrink-0"
                whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.85 }} aria-expanded={isExpanded}
                aria-controls={`children-${role.id}`}>
                <svg className={`w-4 h-4 transform ${isExpanded ? 'rotate-90' : 'rotate-0'} transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
              </motion.button>
            ) : (<div className="w-8 h-8 ml-1 flex-shrink-0 flex items-center justify-center text-sm text-gray-400"><span className="text-lg">○</span></div>)}
            <div className="flex flex-col overflow-hidden">
              <h4 className="text-base sm:text-lg font-extrabold capitalize text-purple-900 flex items-center gap-2">
                {role.name}
                {role.name.toLowerCase() === 'super-admin' && <span className="text-xs bg-red-700 text-white px-2 py-0.5 rounded-full font-mono shadow-md">ROOT ADMIN</span>}
              </h4>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate flex items-center gap-1">
                <span className="text-indigo-500 font-bold">↑</span>
                Parent: <span className="font-semibold capitalize text-gray-700">{parentName}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end col-span-1 sm:col-span-2 min-w-[110px]">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className="w-[110px] sm:w-[125px] px-2 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-indigo-300/50 transition"
              onClick={() => onSetPermissions(role)}>📝 Set Permissions</motion.button>
            {(role.name.toLowerCase() !== 'super-admin' && role.name.toLowerCase() !== 'admin') && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="w-[90px] sm:w-[110px] px-2 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-600 hover:text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-red-300/50 transition"
                onClick={() => onDeleteRole(role)}>🗑️ Delete</motion.button>
            )}
          </div>
        </div>
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div id={`children-${role.id}`} className="mt-1 pb-1"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto', transition: { duration: 0.26 } }}
              exit={{ opacity: 0, height: 0, transition: { duration: 0.14 } }}>
              {role.children.map(childRole => (
                <RoleNode key={childRole.id} role={childRole} depth={depth + 1}
                  onSetPermissions={onSetPermissions} onDeleteRole={onDeleteRole} allRoles={allRoles} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

// --- Main Manager (unchanged except for card/detail style tweaks)
const RoleHierarchyManager = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [deleteRole, setDeleteRole] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [permRole, setPermRole] = useState(null);
  const [showRoleExistsModal, setShowRoleExistsModal] = useState(false);
  const [existingRoleName, setExistingRoleName] = useState("");
  useEffect(() => { fetchRoles(); }, []);
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type }), 2300);
  };
  const fetchRoles = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(API_URL, { headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` }, });
      if (!res.ok) throw new Error("Failed to fetch roles");
      const data = await res.json(); setRoles(data);
    } catch (err) {
      setError("Could not load roles. Please check your network or API status."); setRoles([]);
    } finally { setLoading(false); }
  };
  const handleCreateRole = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    const trimmedRoleName = newRoleName.trim();
    if (!trimmedRoleName) { setError("Role name cannot be empty."); setSaving(false); return; }
    try {
      const payload = { name: trimmedRoleName };
      if (newParentId) payload.report_to = newParentId;
      const res = await fetch(API_URL, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 400 && typeof errData.detail === "string" && errData.detail.toLowerCase().includes("already exists")) {
          setExistingRoleName(trimmedRoleName); setShowRoleExistsModal(true); setSaving(false); return;
        }
        throw new Error(errData.detail || "Failed to create role");
      }
      setShowCreate(false); setNewRoleName(""); setNewParentId(""); setError(""); showToast("Role created successfully", "success"); fetchRoles();
    } catch (err) {
      setError(err.message || "Could not create role."); showToast(err.message || "Could not create role.", "error");
    } setSaving(false);
  };
  const handleDeleteRole = async () => {
    if (!deleteRole) return; setSaving(true); setError("");
    try {
      const res = await fetch(`${API_URL}${deleteRole.id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Could not delete role");
      }
      setShowDeleteModal(false); setDeleteRole(null); fetchRoles(); showToast("Role deleted successfully", "success");
    } catch (err) {
      setError(err.message || "Could not delete role. Ensure no users report to this role."); showToast(err.message || "Could not delete role.", "error");
    } setSaving(false);
  };

  const roleTree = buildRoleTree(roles);

  if (loading)
    return <div className="p-8 sm:p-12 text-center text-indigo-700 bg-indigo-100 border border-indigo-300 rounded-xl font-semibold text-md sm:text-lg max-w-lg mx-auto mt-8 sm:mt-10">Loading Role Hierarchy...</div>;
  if (error && !toast.show)
    return <div className="p-8 sm:p-12 text-center text-red-700 bg-red-100 border border-red-400 rounded-xl font-semibold text-md sm:text-lg max-w-lg mx-auto mt-8 sm:mt-10">Error: {error}</div>;

  return (
    <div className="p-2 sm:p-4 md:p-7 bg-gray-50 min-h-screen">
      {/* Toast Message */}
      <AnimatePresence>
        {toast.show && (
          <motion.div className={`fixed top-2 sm:top-4 right-2 sm:right-4 z-[9999] p-3 sm:p-4 pr-7 rounded-xl shadow-2xl font-bold text-white transition-all flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}
              initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}>
              {toast.type === 'success' ? '👍' : '🚨'} {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Top Title and Create Button */}
      <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 140, damping: 18 }}>
        <header className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-6 sm:mb-8 pb-3 sm:pb-4 border-b-4 border-purple-300">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-800 to-indigo-600 tracking-tight drop-shadow-lg">
            Role Hierarchy Management 🛠️
          </h2>
          <motion.button whileHover={{ scale: 1.05, boxShadow: "0 10px 20px rgba(99, 102, 241, 0.4)" }} whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-r from-purple-600 to-indigo-500 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-xl shadow-lg font-extrabold transition duration-200 w-full sm:w-auto mt-2 sm:mt-0 text-lg border-b-4 border-indigo-700 hover:border-b-indigo-500"
            onClick={() => { setShowCreate(true); setError(""); setNewParentId(""); }}>
            ➕ Create New Role
          </motion.button>
        </header>
        <section className="bg-white px-2 sm:px-7 pt-4 pb-8 rounded-2xl sm:rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.09)] border border-cyan-200 max-w-5xl mx-auto">
          <h3 className="text-2xl font-bold mb-5 text-purple-800 border-b pb-2 flex items-center gap-2">
           Manage Roles and Permissions
          </h3>
          {roleTree.length > 0 ? (
            <div className="p-1 sm:p-2">
              <div className="grid grid-cols-4 sm:grid-cols-6 font-extrabold text-xs sm:text-sm text-gray-700 bg-gray-100 rounded-lg py-3 mb-3 px-2 sm:px-4 shadow-inner">
                <div className="col-span-3 sm:col-span-4 flex items-center gap-2"><span className="text-base text-purple-600">👥</span> Role Name & Parent</div>
                <div className="col-span-1 sm:col-span-2 text-right">Actions</div>
              </div>
              <AnimatePresence>
                {roleTree.map(role => (
                  <RoleNode key={role.id} role={role} depth={0} onSetPermissions={setPermRole} onDeleteRole={role => { setDeleteRole(role); setShowDeleteModal(true); }} allRoles={roles} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <p className="text-center p-8 sm:p-10 text-gray-500 text-lg bg-gray-50 rounded-xl border border-dashed border-gray-300">No roles found. Start by creating the top-level role!</p>
          )}
        </section>
      </motion.div>

      {/* Create Role Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-30"
            initial="hidden" animate="visible" exit="exit" variants={modalVariants}>
            <motion.form onSubmit={handleCreateRole} className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-lg relative border-t-8 border-purple-500"
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 230, damping: 22 } }} exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.18 } }}>
              <button type="button" onClick={() => setShowCreate(false)} className="absolute top-4 right-4 text-2xl sm:text-3xl text-gray-400 hover:text-red-500 font-light">
                <span className="block w-8 h-8 rounded-full bg-gray-100 hover:bg-red-500 hover:text-white flex items-center justify-center">&times;</span>
              </button>
              <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-purple-900 border-b pb-2 flex items-center gap-2">
                <span className="text-purple-600 text-2xl">✨</span> Define New Role
              </h3>
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2" htmlFor="roleName">Role Name:</label>
                <input id="roleName" type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
                  className="w-full p-2 sm:p-3 border border-cyan-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition shadow-sm"
                  placeholder="Enter role name" required />
              </div>
              <div className="mb-6">
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2" htmlFor="parentRole">Reports To (Select Upper Person):</label>
                <select id="parentRole" value={newParentId} onChange={e => setNewParentId(e.target.value)}
                  className="w-full p-2 sm:p-3 border border-cyan-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 bg-white transition shadow-sm">
                  <option value="">-- No Parent (Top Level / CEO) --</option>
                  {roles.filter(r => r.name.toLowerCase() !== 'super-admin').map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              {error && <motion.div className="text-red-600 text-sm mb-4 p-2 bg-red-50 border border-red-300 rounded-lg" initial="hidden" animate="visible" exit="exit" variants={errorAnim}>{error}</motion.div>}
              <motion.button type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold rounded-xl px-4 py-3 shadow-xl hover:shadow-purple-400/50 hover:from-purple-700 hover:to-indigo-700 transition duration-200 text-lg"
                disabled={saving} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                {saving ? "Creating Role..." : "Create Role"}
              </motion.button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delete Role Modal */}
      <AnimatePresence>
        {showDeleteModal && deleteRole && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-30"
            initial="hidden" animate="visible" exit="exit" variants={modalVariants}>
            <motion.div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm p-8 shadow-lg relative text-center border-t-8 border-red-500"
              initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 230, damping: 22 } }} exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.18 } }}>
              <div className="text-4xl sm:text-6xl mb-4 text-red-500">⚠️</div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-red-800">Confirm Deletion</h3>
              <p className="mb-6 text-gray-600 text-sm sm:text-md">
                Are you sure you want to delete the role: <span className="font-bold capitalize text-red-700 text-lg">{`"${deleteRole.name}"`}</span>?
                <br />This action is <b>permanent</b> and cannot be undone.
              </p>
              {error && <motion.div className="text-red-600 text-sm mb-4 p-2 bg-red-50 border border-red-300 rounded-lg" initial="hidden" animate="visible" exit="exit" variants={errorAnim}>{error}</motion.div>}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <motion.button className="flex-1 bg-gray-200 text-gray-700 font-bold rounded-xl px-4 py-3 hover:bg-gray-300 transition shadow-md"
                  onClick={() => setShowDeleteModal(false)} disabled={saving}
                  whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.96 }}>Cancel</motion.button>
                <motion.button className="flex-1 bg-red-600 text-white font-bold rounded-xl px-4 py-3 hover:bg-red-700 transition shadow-lg hover:shadow-red-400/50"
                  onClick={handleDeleteRole} disabled={saving}
                  whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.96 }}>{saving ? "Deleting..." : "Yes, Delete"}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Role Exists Modal */}
      <AnimatePresence>
        {showRoleExistsModal && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black bg-opacity-30"
            initial="hidden" animate="visible" exit="exit" variants={modalVariants}>
            <motion.div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-sm p-8 shadow-lg relative text-center border-t-8 border-yellow-500"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 230, damping: 22 } }} exit={{ scale: 0.95, opacity: 0, transition: { duration: 0.19 } }}>
              <div className="text-5xl sm:text-6xl mb-4 text-yellow-500">⚠️</div>
              <h3 className="text-xl sm:text-2xl font-bold mb-2 text-yellow-800">Role Already Exists</h3>
              <p className="mb-6 text-gray-600 text-sm sm:text-md">
                A role named <span className="font-bold capitalize text-yellow-700 text-lg">{`"${existingRoleName}"`}</span> already exists in the system. Please choose a different, unique name.
              </p>
              <motion.button className="w-full bg-yellow-600 text-white font-bold rounded-xl px-4 py-3 hover:bg-yellow-700 transition shadow-lg hover:shadow-yellow-400/50"
                onClick={() => setShowRoleExistsModal(false)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.97 }}>
                Got It
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Permissions Modal */}
      <AnimatePresence>
        {permRole && (
          <RolePermissionsModal
            role={permRole}
            onClose={() => setPermRole(null)}
            onSaved={fetchRoles}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoleHierarchyManager;
