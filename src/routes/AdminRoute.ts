import express from "express";
import { AdminLogin } from "../controllers";
import { Authenticate } from "../middleware";

const router = express.Router();

/* ------------------- Login --------------------- */
router.post("/login", AdminLogin);

/* ------------------- Authentication --------------------- */
router.use(Authenticate);

/* ------------------- Add Stock --------------------- */

export { router as AdminRoute };
