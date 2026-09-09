"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const routes_1 = require("./routes");
const authorization_1 = require("./auth/authorization");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(express_1.default.json({ limit: "2mb" }));
app.use((0, cookie_parser_1.default)());
app.set("trust proxy", 1);
app.get("/health", (_req, res) => res.json({ status: "ok", service: "gym-crm-backend" }));
(0, routes_1.registerApiRoutes)(app);
app.use((err, _req, res, _next) => {
    if (err instanceof authorization_1.AuthError) {
        return res.status(err.status).json({ message: err.message });
    }
    console.error("Unhandled API error:", err);
    return res.status(500).json({ message: "Internal server error." });
});
app.use((_req, res) => res.status(404).json({ message: "API endpoint not found." }));
app.listen(env_1.env.port, () => {
    console.log(`Gym CRM backend listening on :${env_1.env.port}`);
});
