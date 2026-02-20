import { Router } from "express";

// Health route: used for uptime checks and quick backend verification.
const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "Backend running", port: Number(process.env.PORT || 5000) });
});

export default router;
