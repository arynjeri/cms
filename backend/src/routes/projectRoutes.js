const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const  authorize  = require("../middleware/auth"); 

// Ensure projectController functions exist before calling them
router.get("/", authorize(), projectController.getMyProjects);

router.post("/", authorize(), projectController.createProject);

router.post("/:id/publish", authorize(), projectController.publishToMarketplace);

router.put('/:id', authorize(), projectController.updateProject);

router.delete('/:id', authorize(), projectController.deleteProject);

module.exports = router;