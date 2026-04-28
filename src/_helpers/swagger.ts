import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";

const router = express.Router();
const swaggerDocument = YAML.load(path.join(__dirname, "../../swagger.yaml"));

router.use("/", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;
