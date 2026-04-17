const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, phoneNumber, password } = req.body;

    const existingAdmin = await User.findOne({ email });

    if (existingAdmin) {
      return res.status(400).json({
        message: "Admin with this email already exists"
      });
    }

    const newAdmin = new User({
      name,
      email,
      phoneNumber,
      passwordHash: password,
      role: "admin"
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Admin created successfully"
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};
// Delete User + Generate Audit Trail
exports.deleteUser = async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }

    // CREATE THE AUDIT LOG: Capture info before the user is gone
    await AuditLog.create({
      action: "DELETE_USER",
      performedBy: req.user._id, // The Admin doing the deleting
      targetName: userToDelete.name,
      targetEmail: userToDelete.email,
      details: `User with role [${userToDelete.role}] was permanently deleted.`
    });

    // NOW DELETE
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted and action logged in history' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Deletion & Action History (Admin Only)
exports.getAuditLogs = async (req, res) => {
  try {
    // Populate 'performedBy' to see the name of the Admin who did the action
    const logs = await AuditLog.find()
      .populate('performedBy', 'name email')
      .sort({ timestamp: -1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');

    if (
        req.user.role !== 'admin' &&
        req.user._id.toString() !== req.params.id
    ) {
      return res.status(403).json({ 
        message: 'You can only access your own profile or are not authorized to view this user' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.updateUser = async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    if (
     req.user.role !== 'admin' &&
     req.user._id.toString() !== req.params.id
      ) {
     return res.status(403).json({
       message: 'You can only update your own profile'
  });
}


    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, phoneNumber },
      { new: true }
    ).select('-passwordHash');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
