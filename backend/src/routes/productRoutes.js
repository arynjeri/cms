const fs = require('fs');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authorize = require('../middleware/auth');
const productController = require('../controllers/productController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    
    // Safety: check if it exists in the rare case it doesn't, create it
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get('/', productController.getAllProducts);
router.post('/', authorize(), upload.single('image'), productController.createProduct);
router.delete('/:id', authorize(), productController.deleteProduct);


router.put('/:id', authorize(), upload.single('image'), productController.updateProduct);


router.patch('/:id/status', authorize(['admin']), productController.updateStatus);
module.exports = router;
