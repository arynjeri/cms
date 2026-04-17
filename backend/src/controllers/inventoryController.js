const Inventory = require('../models/Inventory');


exports.createItem = async (req, res) => {
  try {
    const { name, quantity, unit, measurementType, pricePerUnit, packetWeight, materialType, color } = req.body;

    if (!name || !quantity || !unit || !measurementType || !pricePerUnit) {
      return res.status(400).json({ message: 'Name, quantity, unit, measurementType and pricePerUnit are required' });
    }

    const parsedPacketWeight = packetWeight ? Number(packetWeight) : 100;

    if (quantity < 0 || pricePerUnit < 0 || (packetWeight && parsedPacketWeight < 0)) {
      return res.status(400).json({ message: 'Values cannot be negative' });
    }

    if (quantity < 0) {
      return res.status(400).json({ message: 'Quantity cannot be negative' });
    }

    const item = await Inventory.create({
      name,
      materialType: materialType || 'other',
      color: color || '',
      measurementType,
      packetWeight: parsedPacketWeight,
      quantity: parseFloat(quantity),
      unit,
      pricePerUnit,
      owner: req.user._id
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getInventory = async (req, res) => {
  try {
    let items;

    if (req.user.role === 'admin') {
      items = await Inventory.find().populate('owner', 'name email');
    } else {
      items = await Inventory.find({ owner: req.user._id });
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Admin cannot edit
    if (req.user.role === 'admin') {
      return res.status(403).json({
        message: 'Admin cannot modify artisan inventory'
      });
    }

    // Only owner can edit
    if (item.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const { quantity, unit, measurementType, packetWeight, materialType, color } = req.body;

    let updatedFields = { ...req.body };

    // Normalize numeric fields
    if (quantity !== undefined) updatedFields.quantity = parseFloat(quantity);
    if (packetWeight !== undefined) updatedFields.packetWeight = Number(packetWeight);

    if (unit) updatedFields.unit = unit;
    if (measurementType) updatedFields.measurementType = measurementType;
    if (materialType) updatedFields.materialType = materialType;
    if (color !== undefined) updatedFields.color = color;

    const updatedItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true }
    );

    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (
      req.user.role !== 'admin' &&
      item.owner.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    await item.deleteOne();

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
