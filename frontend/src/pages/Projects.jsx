/* eslint-disable no-unused-vars */
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import API from "../services/api";

function Projects() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [projects, setProjects] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({ name: "", description: "", craftType: "Knitting", status: "ongoing" });
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [tempQty, setTempQty] = useState(1);

  // Helper: Calculate Days Taken
  const calculateDays = (start, end) => {
    if (!start || !end) return "";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffInMs = endDate.getTime() - startDate.getTime();
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (days < 1) return "Same Day";
    if (days === 1) return "1 Day";
    return `${days} Days`;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, iRes] = await Promise.all([API.get("/projects"), API.get("/inventory")]);
      setProjects(pRes.data);
      setInventory(iRes.data);
    } catch (err) { console.error("Sync error", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user?.role === "artisan") loadData(); }, [user, loadData]);

  const inputClass = `w-full p-4 rounded-xl border-2 outline-none transition-all ${
    isDark 
    ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400 focus:border-indigo-500" 
    : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-400 shadow-sm"
  }`;

  const addMaterial = (e) => {
    const inventoryId = e.target.value;
  const item = inventory.find(i => i._id === inventoryId);
  if (!item) return;

  setSelectedMaterials(prev => {
    const existing = prev.find(m => m.inventoryItem === inventoryId);
    if (existing) {
      // If already linked, update the quantity with the new tempQty
      return prev.map(m => 
        m.inventoryItem === inventoryId 
        ? { ...m, quantityUsed: Number(tempQty) } 
        : m
      );
    }
    // If new, add it to the list
    return [...prev, {
      inventoryItem: inventoryId,
      name: item.name,
      unit: item.unit,
      quantityUsed: Number(tempQty)
    }];
  });
  setTempQty(1); // Reset qty for the next item
  e.target.value = ""; // Reset the select dropdown
};
  const removeMaterial = (inventoryId) => {
  setSelectedMaterials(selectedMaterials.filter(m => m.inventoryItem !== inventoryId));
};

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/projects/${editingId}`, { ...formData });
      } else {
        await API.post("/projects", { ...formData, materials: selectedMaterials });
        const materialSummary = selectedMaterials
          .map(m => `${m.quantityUsed} ${m.unit} ${m.name}`)
          .join(", ");
        alert(`Project Launched! Deducted: ${materialSummary} from your stash. 🧶`);
      }
      
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", description: "", craftType: "Knitting", status: "ongoing" });
      setSelectedMaterials([]);
      loadData();
    } catch (err) { 
      alert("Failed to save project. Check if you have enough materials in your stash!"); 
    }
  };

  const handleCancel = () => {
  setShowForm(false);
  setEditingId(null);
  setFormData({ name: "", description: "", craftType: "Knitting", status: "ongoing" });
  setSelectedMaterials([]); // Clear the linked materials
};

  const startEdit = (project) => {
    setFormData({ 
      name: project.name, 
      description: project.description, 
      craftType: project.craftType, 
      status: project.status 
    });
    setEditingId(project._id);
    setShowForm(true);
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await API.delete(`/projects/${id}`);
      loadData();
    } catch (err) { alert("Delete failed"); }
  };

  const promoteToMarket = (project) => {
    const marketData = {
      name: project.name,
      description: project.description,
      category: project.craftType,
      originProject: project._id,
      price: 0 
    };
    window.location.href = `/marketplace?prefill=${encodeURIComponent(JSON.stringify(marketData))}`;
  };

  return (
    <div className={`min-h-screen p-8 transition-colors duration-300 ${isDark ? "bg-slate-900" : "bg-slate-50"}`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-end mb-12 border-b-2 border-indigo-100 pb-6">
          <div>
            <h1 className={`text-5xl font-serif font-black ${isDark ? "text-white" : "text-slate-950"}`}>
              Project <span className="italic text-indigo-500">Journal</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mt-2 font-black">Workbench & WIPs</p>
          </div>
          <button 
            onClick={() => { setShowForm(!showForm); setEditingId(null); }} 
            className="bg-indigo-600 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
          >
            {showForm ? "Close Ledger" : "Start New Work"}
          </button>
        </header>

        {/* Form Section */}
        {showForm && (
          <div className={`mb-12 p-8 rounded-[2.5rem] border-2 border-dashed ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-indigo-300 shadow-xl"}`}>
            <h2 className="text-xl font-black mb-6 uppercase tracking-tighter text-indigo-500">
              {editingId ? "Update Progress" : "New Project Details"}
            </h2>
            <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <input placeholder="Project Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} required />
                <textarea placeholder="Process notes..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={inputClass} rows="4" />
                
                {editingId && (
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className={inputClass}>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                )}
              </div>
              
              <div className="space-y-4">
                {!editingId && (
                  <>
                    <h3 className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Link Stash Materials</h3>
                    <div className="flex gap-2">
                      <input type="number" value={tempQty} onChange={e => setTempQty(e.target.value)} className={`${inputClass} w-24`} min="1" />
                      <select onChange={(e) => addMaterial(e)} className={inputClass} value="">
                        <option value="" disabled>Pick/Update from Stash...</option>
                        {inventory.map(i => <option key={i._id} value={i._id} disabled={i.quantity < 1}>{i.name} ({i.quantity} {i.unit})</option>)}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-2 p-4 border-2 border-dashed rounded-xl min-h-[100px] items-start bg-slate-50/50 dark:bg-slate-900/30">
                      {selectedMaterials.length === 0 && <p className="text-[10px] text-slate-400 italic uppercase font-black">No materials linked...</p>}
                      {selectedMaterials.map((m, i) => (
                        <button 
                          key={i} 
                          type="button"
                          onClick={() => removeMaterial(m.inventoryItem)}
                          className="bg-indigo-600 hover:bg-red-500 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm transition-all group flex items-center gap-2"
                        >
                          {m.name} x{m.quantityUsed}
                          <span className="opacity-50 group-hover:opacity-100 font-bold">✕</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                
                <div className="flex gap-3">
                  <button type="submit" className="flex-[2] bg-slate-950 text-white dark:bg-indigo-600 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:opacity-90 transition-all">
                    {editingId ? "SAVE UPDATES" : "LAUNCH PROJECT"}
                  </button>
                  <button 
                    type="button" 
                    onClick={handleCancel}
                    className="flex-1 bg-transparent border-2 border-slate-200 dark:border-slate-700 text-slate-400 py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map(p => (
            <div key={p._id} className={`p-8 rounded-[2.5rem] border-2 transition-all hover:shadow-2xl flex flex-col justify-between ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100 shadow-sm"}`}>
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className={`text-[9px] font-black uppercase px-4 py-1 rounded-full tracking-widest border ${
                    p.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-500 border-indigo-100'
                  }`}>
                    {p.status}
                  </span>
                  <button onClick={() => deleteProject(p._id)} className="text-slate-300 hover:text-red-500 transition-colors font-black text-xl">✕</button>
                </div>
                <h2 className="font-serif text-3xl font-bold mb-3 text-slate-950 dark:text-white leading-tight">
                  {p.name}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-3 mb-6 leading-relaxed">
                  {p.description || "No notes added yet."}
                </p>
              </div>

              <div className="border-t pt-6 border-slate-100 dark:border-slate-700 mt-4">
                <div className="flex flex-wrap justify-between items-start mb-6 gap-y-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                      Started: {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                    {p.status === 'completed' && p.completedAt && (
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                        Finished in: {calculateDays(p.createdAt, p.completedAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex flex-col items-end max-w-[120px]">
                      {p.materials && p.materials.length > 0 ? (
                        p.materials.map((m, idx) => (
                          <span key={idx} className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tighter text-right leading-none mb-1">
                            {m.quantityUsed} {m.unit || ''} {m.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          No Materials
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => startEdit(p)} 
                      className="text-indigo-600 dark:text-indigo-400 font-black text-[9px] uppercase tracking-widest hover:underline mt-1"
                    >
                      Update →
                    </button>
                  </div>
                </div>
                
                {p.status === 'completed' && (
                  <>
                    {!p.linkedProduct ? (
                      <button 
                        onClick={() => promoteToMarket(p)}
                        className="w-full py-4 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-600 transition-all shadow-md active:scale-95"
                      >
                        LIST ON MARKETPLACE
                      </button>
                    ) : (
                      <div className="w-full py-4 bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700">
                        <span className="text-emerald-500 font-bold">✓</span> Already in Store
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {projects.length === 0 && !loading && (
          <div className="text-center py-20">
            <p className="text-slate-400 italic font-serif text-xl underline decoration-indigo-200">The workbench is currently empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}
export default Projects;