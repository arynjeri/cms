const express = require('express');
const router = express.Router();
const authorize = require('../middleware/auth');
const inventoryController = require('../controllers/inventoryController');

router.post('/', authorize(), inventoryController.createItem);
router.get('/', authorize(), inventoryController.getInventory);
router.put('/:id', authorize(), inventoryController.updateItem);
router.delete('/:id', authorize(), inventoryController.deleteItem);

module.exports = router;
