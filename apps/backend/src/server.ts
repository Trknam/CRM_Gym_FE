import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import { registerApiRoutes } from "./routes";
import { AuthError } from "./auth/authorization";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.set("trust proxy", 1);

app.get("/health", (_req, res) => res.json({ status: "ok", service: "gym-crm-backend" }));
registerApiRoutes(app);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AuthError) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error("Unhandled API error:", err);
  return res.status(500).json({ message: "Internal server error." });
});

app.use((_req, res) => res.status(404).json({ message: "API endpoint not found." }));

app.listen(env.port, () => {
  console.log(`Gym CRM backend listening on :${env.port}`);
});