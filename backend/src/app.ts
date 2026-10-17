import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import multer from "multer";
import { isAllowedOrigin } from "./lib/origins";
import { publicRouter } from "./routes/public";
import { adminRouter } from "./routes/admin";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || isAllowedOrigin(origin)),
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "100kb" }));

  app.use("/api/admin", adminRouter);
  app.use("/api", publicRouter);

  app.use((_req, res) => { res.status(404).json({ error: "Not found." }); });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.code === "LIMIT_FILE_SIZE" ? "File is too large." : "Upload failed." });
      return;
    }
    if (err?.type === "entity.parse.failed") {
      res.status(400).json({ error: "Invalid JSON body." });
      return;
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  };
  app.use(onError);
  return app;
}
