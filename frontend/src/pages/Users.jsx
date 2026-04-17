/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

function Users() {
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [showAudit, setShowAudit] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [newAdmin, setNewAdmin] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    password: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    phoneNumber: "",
  });

  useEffect(() => {
    if (user?.role !== "admin") {
      setError("You don't have permission to access this page");
      return;
    }

    fetchUsers();
    fetchAuditLogs();
  }, [user]);

  // Read role filter from URL query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const roleParam = searchParams.get('role');
    if (roleParam) {
      setFilter(roleParam);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await API.get("/users");
      setUsers(response.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await API.get("/users/audit-logs");
      setAuditLogs(response.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await API.post("/users/create-admin", {
        name: newAdmin.name,
        email: newAdmin.email,
        phoneNumber: newAdmin.phoneNumber,
        password: newAdmin.password,
      });

      alert("Admin created successfully");
      setNewAdmin({
        name: "",
        email: "",
        phoneNumber: "",
        password: "",
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create admin");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;

    try {
      await API.delete(`/users/${id}`);
      fetchUsers();
      fetchAuditLogs();
      alert("User deleted and logged successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete user");
    }
  };

  const openEditModal = (selectedUser) => {
    setEditingUser(selectedUser);
    setEditForm({
      name: selectedUser.name || "",
      phoneNumber: selectedUser.phoneNumber || "",
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/users/${editingUser._id}`, editForm);
      alert("User updated successfully");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update user");
    }
  };

  const filteredUsers = users.filter((u) =>
    filter === "all" ? true : u.role === filter
  );

  const getRoleColor = (role) => {
    switch (role) {
      case "admin":
        return isDark ? "bg-red-900 text-red-100" : "bg-red-100 text-red-800";
      case "artisan":
        return isDark ? "bg-blue-900 text-blue-100" : "bg-blue-100 text-blue-800";
      case "customer":
        return isDark ? "bg-green-900 text-green-100" : "bg-green-100 text-green-800";
      default:
        return isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800";
    }
  };

  if (error && error.includes("permission")) {
    return <div className="p-6 rounded-lg text-center">{error}</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">👥 Admin Control Center</h1>
        <p className={isDark ? "text-gray-400" : "text-gray-600"}>
          Manage users, admins, and audit history
        </p>
      </div>

      <div className={`p-6 rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <h2 className="text-xl font-bold mb-4">➕ Create New Admin</h2>
        <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            placeholder="Name"
            value={newAdmin.name}
            onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
            className="p-3 rounded-lg border"
            required
          />
          <input
            placeholder="Email"
            type="email"
            value={newAdmin.email}
            onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            className="p-3 rounded-lg border"
            required
          />
          <input
            placeholder="Phone Number"
            value={newAdmin.phoneNumber}
            onChange={(e) => setNewAdmin({ ...newAdmin, phoneNumber: e.target.value })}
            className="p-3 rounded-lg border"
            required
          />
          <input
            placeholder="Password"
            type="password"
            value={newAdmin.password}
            onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
            className="p-3 rounded-lg border"
            required
          />
          <button type="submit" className="md:col-span-4 bg-indigo-600 text-white py-3 rounded-lg font-bold">
            Create Admin
          </button>
        </form>
      </div>

      <div className="flex gap-2">
        {['all', 'admin', 'artisan', 'customer'].map((role) => (
          <button
            key={role}
            onClick={() => setFilter(role)}
            className="px-4 py-2 rounded-lg border"
          >
            {role}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">All Users</h2>
        <div className="space-y-3">
          {filteredUsers.map((u) => (
            <div key={u._id} className="flex justify-between items-center border rounded-lg p-4">
              <div>
                <p className="font-semibold">{u.name}</p>
                <p className="text-sm">{u.email}</p>
                <p className="text-sm">{u.phoneNumber}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm ${getRoleColor(u.role)}`}>
                  {u.role}
                </span>
                <button
                  onClick={() => openEditModal(u)}
                  className="bg-blue-500 text-white px-3 py-1 rounded-lg"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(u._id)}
                  className="bg-red-500 text-white px-3 py-1 rounded-lg"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md rounded-2xl p-6 shadow-2xl ${
            isDark
            ? "bg-slate-800 text-white border border-slate-700"
            : "bg-white text-gray-900"
          }`}
          >
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full p-3 border rounded-lg"
                placeholder="Name"
              />
              <input
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                className="w-full p-3 border rounded-lg"
                placeholder="Phone Number"
              />
              <div className="flex gap-3">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-lg">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 border py-3 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div>
        <button
          onClick={() => setShowAudit(!showAudit)}
          className="bg-slate-700 text-white px-4 py-2 rounded-lg"
        >
          {showAudit ? "Hide" : "Show"} Audit Logs
        </button>

        {showAudit && (
          <div className="mt-4 space-y-3">
            {auditLogs.length === 0 ? (
              <p className={isDark ? "text-gray-500" : "text-gray-500"}>
                No audit logs available.
                </p>
            ) : (
              auditLogs.map((log) => (
                <div 
                key={log._id} 
                className={`p-4 rounded-xl border ${
                  isDark 
                  ? "bg-gray-800 border-gray-700 text-white" 
                  : "bg-white border-gray-200"}`}
                  >
                  <p className="font-semibold">{log.action}</p>
                  <p className="text-sm mt-1">{log.details}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Target: {log.targetName} ({log.targetEmail})
                  </p>
                  <p className="text-sm text-gray-500">
                    By: {log.performedBy?.name || "Unknown Admin"} 
                    {
                    new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );

}
export default Users;
