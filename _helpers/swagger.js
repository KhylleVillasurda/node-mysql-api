import express from "express";
const router = express.Router();
import swaggerUI from "swagger-ui-express";
import YAML from "yamljs";
const swaggerDocument = YAML.load("./swagger.yaml");

router.use("/", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

export default router;