//inventory deduction logic
const Inventory = require('../models/Inventory');

function normalizeQuantity(quantity, fromUnit, toUnit) {
  if (fromUnit === toUnit) return quantity;

  const conversions = {
    kg_to_g: q => q * 1000,
    cm_to_m: q => q / 100
  };

  const key = `${fromUnit}_to_${toUnit}`;

  if (!conversions[key]) {
    throw new Error('Unsupported unit conversion');
  }

  return conversions[key](quantity);
}

async function deductInventory(materialsUsed) {
  for (const material of materialsUsed) {
    const item = await InventoryItem.findById(material.inventoryItemId);

    if (!item) {
      throw new Error('Inventory item not found');
    }

    const quantityToDeduct = normalizeQuantity(
      material.quantityUsed,
      material.unit,
      item.baseUnit
    );

    if (item.remainingQuantity < quantityToDeduct) {
      throw new Error('Insufficient inventory');
    }

    item.remainingQuantity -= quantityToDeduct;
    await item.save();
  }
}

module.exports = { deductInventory };
