const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const permissionMiddleware = require("../middleware/permissionMiddleware");
const qcUserController = require("../controllers/qcUserController");

router.use(authMiddleware);
router.use(permissionMiddleware(["qc.access"]));

router.get("/", permissionMiddleware(["qc.users.read"]), qcUserController.listQcUsers);
router.post("/create-site", permissionMiddleware(["qc.users.create"]), qcUserController.createQcSiteUser);
router.post("/create-hub", permissionMiddleware(["qc.users.create"]), qcUserController.createQcHubUser);

module.exports = router;


