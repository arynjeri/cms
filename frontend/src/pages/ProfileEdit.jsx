import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

function ProfileEdit() {
  const { user, login } = useAuth();
  const { isDark } = useTheme();

  const [formData, setFormData] = useState({
    name: user?.name || "",
    phoneNumber: user?.phoneNumber || "",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("phoneNumber", formData.phoneNumber);
    if (file) data.append("profilePic", file);

    try {
      const res = await API.put("/users/update", data, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      if (res.data.token) {
        // re-logging in with the NEW token
        login(res.data.token);
        alert("Success: Profile and permissions synchronized.");
      }
    } catch (err) {
      console.error(err);
      alert("Update failed. You might need to log out and back in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen p-8 flex flex-col items-center ${isDark ? "bg-[#0b141a] text-white" : "bg-slate-50"}`}>
      
      {/* VERIFICATION PANEL */}
      <div className={`w-full max-w-md p-6 mb-6 rounded-3xl border shadow-sm ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-4">Verification Status</p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border-2 border-indigo-500">
            {user?.profilePic ? (
              <img 
                  src={`http://localhost:5000${user.profilePic}`} 
                       className="w-full h-full object-cover" 
                        alt="Profile" 
                        crossOrigin="anonymous" 
                  />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-slate-400 bg-slate-200">{user?.name?.charAt(0)}</div>
            )}
          </div>
          <div>
            <p className="font-black text-sm uppercase">{user?.name}</p>
            <p className={`text-[10px] font-bold p-1 px-2 rounded-md inline-block ${user?.role === 'artisan' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              ROLE: {user?.role || "UNKNOWN"}
            </p>
          </div>
        </div>
      </div>

      {/* FORM SECTION */}
      <div className={`w-full max-w-md p-10 rounded-[2.5rem] shadow-2xl ${isDark ? "bg-slate-800" : "bg-white"}`}>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="flex flex-col items-center">
            <label className="cursor-pointer group relative">
              <div className="w-24 h-24 rounded-full bg-slate-100 border-2 border-dashed border-indigo-300 flex items-center justify-center overflow-hidden">
                {file ? (
                  <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-black text-slate-400 uppercase text-center p-2">Change Image (Optional)</span>
                )}
              </div>
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
            </label>
          </div>

          <div className="space-y-4">
            <input 
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Name"
              className={`w-full p-4 rounded-xl text-xs font-bold outline-none ${isDark ? "bg-slate-700" : "bg-slate-50"}`}
            />
            <input 
              type="text" 
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              placeholder="Phone Number"
              className={`w-full p-4 rounded-xl text-xs font-bold outline-none ${isDark ? "bg-slate-700" : "bg-slate-50"}`}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl transition-all"
          >
            {loading ? "Updating..." : "Save Identity"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileEdit;