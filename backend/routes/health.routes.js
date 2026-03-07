import { Router } from "express";

// simple health check endpoint
const router = Router();

router.get("/health", (req, res) => {
  res.json({ status: "Backend running", port: Number(process.env.PORT || 5000) });
});

export default router;
