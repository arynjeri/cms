const Project = require("../models/Project");
const Product = require("../models/Product");
const Inventory = require("../models/Inventory"); 

// Fetching projects
exports.getMyProjects = async (req, res) => {
  try {
    // Ensure we are getting the linkedProduct field
    const projects = await Project.find({ artisan: req.user._id })
      .sort("-createdAt")
      .populate("linkedProduct", "name price"); // Optional: populate to show price in the card
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching projects" });
  }
};
// Creating projects + DEDUCTING INVENTORY
exports.createProject = async (req, res) => {
  try {
    const { name, description, craftType, materials } = req.body;

    // Create the project
    const newProject = new Project({
      name,
      description,
      craftType,
      materials,
      artisan: req.user._id
    });

    // --- INTEGRATION LOGIC: Deduct from Inventory ---
    if (materials && materials.length > 0) {
      for (const item of materials) {
       const stashItem = await Inventory.findById(item.inventoryItem);
  
  if (!stashItem || stashItem.quantity < item.quantityUsed) {
    throw new Error(`Insufficient stock for ${item.name || 'material'}`);
  }

  await Inventory.findByIdAndUpdate(item.inventoryItem, {
    $inc: { quantity: -Math.abs(item.quantityUsed) }
  });
}
    }

    await newProject.save();
    res.status(201).json(newProject);
  } catch (error) {
    console.error("Deduction/Creation Error:", error);
    res.status(400).json({ message: "Creation failed", error: error.message });
  }
};

// Update Project (Edit Status/Notes)
exports.updateProject = async (req, res) => {
  try {
    const updates = { ...req.body };

    // If status is changed to completed, set the date
    if (updates.status === 'completed') {
      updates.completedAt = new Date();
    } else {
      // If they move it back from completed to ongoing, clear the date
      updates.completedAt = null;
    }

    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, artisan: req.user._id },
      updates,
      { new: true }
    );
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

//  Publishing projects to Marketplace
exports.publishToMarketplace = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const newProduct = await Product.create({
      name: project.name,
      description: project.description,
      price: req.body.price,
      seller: req.user._id,
      parentProject: project._id,
      category: project.craftType || "Handmade",
      status: "pending" // Admin will need to approve it
    });

    project.status = "completed";
    project.linkedProduct = newProduct._id;
    await project.save();

    res.status(201).json({ message: "Published to marketplace!", product: newProduct });
  } catch (error) {
    res.status(500).json({ message: "Publishing failed", error: error.message });
  }
};

// Delete Project (Cleanup)
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ 
      _id: req.params.id, 
      artisan: req.user._id 
    });
    
    if (!project) return res.status(404).json({ message: "Project not found" });
    
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
};