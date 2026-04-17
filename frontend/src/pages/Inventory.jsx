/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const unitsByMeasurement = {
  weight: ["g", "kg", "ball", "packet"],
  count: ["pieces", "packet"],
  length: ["cm", "m"]
};

const formatKES = (value) => {
  if (!value || Number.isNaN(value)) return "KSH 0";
  return `KSH ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
};

function Inventory() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    materialType: "yarn",
    color: "",
    measurementType: "weight",
    quantity: "",
    unit: "g",
    pricePerUnit: "",
    packetWeight: "100"
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await API.get("/inventory");
      setItems(res.data);
    } catch (err) { console.error("Fetch error", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user?.role !== "customer") fetchInventory(); }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "measurementType") {
      setFormData({ ...formData, measurementType: value, unit: unitsByMeasurement[value][0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      materialType: item.materialType,
      color: item.color || "",
      measurementType: item.measurementType || "weight",
      quantity: item.quantity,
      unit: item.unit,
      pricePerUnit: item.pricePerUnit
    });
    setEditingId(item._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this material?")) return;
    try {
      await API.delete(`/inventory/${id}`);
      fetchInventory();
    } catch (err) { alert("Delete failed"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/inventory/${editingId}`, formData);
      } else {
        await API.post("/inventory", formData);
      }
      setEditingId(null);
      setShowForm(false);
      setFormData({ name: "", materialType: "yarn", color: "", measurementType: "weight", quantity: "", unit: "g", pricePerUnit: "" });
      fetchInventory();
    } catch (err) { alert("Operation failed"); }
  };

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const inputClass = `p-4 rounded-xl border-2 transition-colors outline-none 
    ${isDark 
      ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500" 
      : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-300"
    }`;

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${isDark ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-end mb-10 border-b-2 border-indigo-100 pb-6">
          <div>
            <h1 className={`text-5xl font-serif font-black ${isDark ? "text-white" : "text-slate-800"}`}>
              The <span className="italic text-indigo-500">Stash</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mt-2 font-black">Material Library & Stock</p>
          </div>
          <button 
            onClick={() => { setShowForm(!showForm); setEditingId(null); }}
            className="bg-indigo-600 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg transform hover:-translate-y-1 transition-all"
          >
            {showForm ? "Close Stash" : "+ Add to Stash"}
          </button>
        </div>

        {/* Analytics Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className={`p-6 rounded-[2rem] border-2 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-indigo-100 shadow-sm"}`}>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Total Stash Value</p>
            <p className={`text-3xl font-serif font-bold ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>
              {formatKES(items.reduce((acc, i) => acc + (i.quantity * i.pricePerUnit), 0))}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input 
            type="text" 
            placeholder="Search your stash..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${inputClass} w-full max-w-md shadow-sm`}
          />
        </div>

        {/* Form Section */}
        {showForm && (
          <div className={`mb-12 p-8 rounded-[2.5rem] border-2 border-dashed ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-indigo-300 shadow-xl"}`}>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input name="name" placeholder="Material Name" value={formData.name} onChange={handleChange} className={inputClass} required />
              <select name="materialType" value={formData.materialType} onChange={handleChange} className={inputClass}>
                <option value="yarn">Yarn</option>
                <option value="beads">Beads/Jewelry</option>
                <option value="other">Other</option>
              </select>
              <input name="color" placeholder="Color/Dye Lot" value={formData.color} onChange={handleChange} className={inputClass} />
              <div className="flex gap-2">
                <input name="quantity" type="number" placeholder="Qty" value={formData.quantity} onChange={handleChange} className={`${inputClass} w-2/3`} required />
                <select name="unit" value={formData.unit} onChange={handleChange} className={`${inputClass} w-1/3 text-xs`}>
                  {unitsByMeasurement[formData.measurementType].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <input name="pricePerUnit" type="number" placeholder="Price/Unit (KSH)" value={formData.pricePerUnit} onChange={handleChange} className={inputClass} required />
              <button type="submit" className="bg-slate-900 text-white dark:bg-indigo-600 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-md">
                {editingId ? "Update Stash" : "Add to Library"}
              </button>
            </form>
          </div>
        )}

        {/* The Stash Table */}
        <div className={`rounded-[2.5rem] overflow-hidden border-2 ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200 shadow-xl"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className={isDark ? "bg-slate-900/80" : "bg-slate-100"}>
                <tr>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Material</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Stock Level</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Value</th>
                  <th className="p-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-slate-700" : "divide-slate-200"}`}>
                {filteredItems.map((item) => (
                  <tr 
                    key={item._id} 
                    className={`transition-all duration-200 
                      ${isDark 
                        ? "hover:bg-slate-700/50 even:bg-slate-800/40" 
                        : "hover:bg-indigo-50/50 even:bg-slate-50"
                      }`}
                  >
                    <td className="p-6">
                      <div className="flex flex-col">
                        <span className="font-serif font-bold text-2xl text-slate-950 dark:text-white leading-tight opacity-100">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-black uppercase tracking-[0.2em] mt-1">
                          {item.materialType} • {item.color || 'Standard'}
                        </span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-block px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          item.quantity <= 5 
                          ? 'bg-amber-100 text-amber-700 animate-pulse border border-amber-200' 
                          : isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.quantity} {item.unit}
                        </span>
                        {item.quantity <= 5 && (
                          <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter ml-1">
                            ⚠️ Low Stock Alert
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-6">
                      <span className="font-black text-slate-900 dark:text-slate-200 opacity-100">
                        {formatKES(item.quantity * item.pricePerUnit)}
                      </span>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-4">
                        <button onClick={() => handleEdit(item)} className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase hover:underline tracking-widest">Edit</button>
                        <button onClick={() => handleDelete(item._id)} className="text-red-500 dark:text-red-400 font-black text-[10px] uppercase hover:underline tracking-widest">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredItems.length === 0 && (
            <div className="p-20 text-center italic text-slate-500 dark:text-slate-400">Your stash is currently empty.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Inventory;