// sets up express middleware and mounts the routes
import express from "express";
import cors from "cors";

import assessmentRoutes from "./routes/assessment.routes.js";
import healthRoutes from "./routes/health.routes.js";

export default function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // return a 400 if the request body has invalid JSON
  app.use((err, req, res, next) => {
    const isJsonSyntaxError =
      err instanceof SyntaxError &&
      (err.type === "entity.parse.failed" || "body" in err);

    if (isJsonSyntaxError) {
      return res.status(400).json({
        error: "Invalid JSON body",
        details: err.message,
      });
    }

    return next(err);
  });

  app.use("/api/assessment", assessmentRoutes);
  app.use("/api", healthRoutes);

  app.get("/", (req, res) => {
    res.json({
      name: "compliance-assistant-backend",
      status: "ok",
      endpoints: {
        health: "/api/health",
        analyze: "/api/assessment/analyze",
        getResult: "/api/assessment/result/:assessmentId",
      },
    });
  });

  return app;
}
