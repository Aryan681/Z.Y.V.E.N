import { Router } from "express";

import user from "./auth/auth.route.js";


const router = Router();

router.use("/user", user);


export default router;