"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthError = exports.ROLE_LABELS = void 0;
exports.requireUser = requireUser;
exports.requireRole = requireRole;
exports.requirePermission = requirePermission;
exports.getAccessibleBranchIds = getAccessibleBranchIds;
exports.requireBranchAccess = requireBranchAccess;
exports.assertBranchScope = assertBranchScope;
const session_1 = require("./session");
const branches_1 = require("../api/branches");
var role_labels_1 = require("./role-labels");
Object.defineProperty(exports, "ROLE_LABELS", { enumerable: true, get: function () { return role_labels_1.ROLE_LABELS; } });
class AuthError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "AuthError";
    }
}
exports.AuthError = AuthError;
async function requireUser(req) {
    const user = await (0, session_1.getCurrentUser)(req);
    if (!user)
        throw new AuthError(401, "UNAUTHORIZED");
    return user;
}
async function requireRole(req, ...roles) {
    const user = await requireUser(req);
    if (!roles.includes(user.role))
        throw new AuthError(403, "FORBIDDEN");
    return user;
}
async function requirePermission(req, permission) {
    const user = await requireUser(req);
    const { hasPermission } = await Promise.resolve().then(() => __importStar(require("./permissions")));
    if (!hasPermission(user.role, permission))
        throw new AuthError(403, "FORBIDDEN");
    return user;
}
/** Single-location application: all users operate on the one main gym location. */
async function getAccessibleBranchIds(_req) {
    return [await (0, branches_1.getMainBranchId)()];
}
async function requireBranchAccess(req, branchId) {
    await requireUser(req);
    const mainBranchId = await (0, branches_1.getMainBranchId)();
    if (branchId !== mainBranchId)
        throw new AuthError(403, "FORBIDDEN");
    return (0, session_1.getCurrentUser)(req);
}
async function assertBranchScope(req, branchId) {
    return requireBranchAccess(req, branchId);
}
