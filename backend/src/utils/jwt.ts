import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // 缺少密钥时拒绝启动，避免静默使用可预测的密钥签发 token
    throw new Error("环境变量 JWT_SECRET 未配置，拒绝启动");
  }
  return secret;
}

const JWT_SECRET = requireJwtSecret();
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"];

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
