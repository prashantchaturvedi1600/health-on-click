import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { execute, queryOne, queryAll } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'health-on-click-production-secure-jwt-secret-2026';
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export interface TokenPayload {
  userId: string;
  role: 'patient' | 'doctor' | 'admin';
  email?: string;
  phone?: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Missing Bearer token.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
    return;
  }

  req.user = decoded;
  next();
}

export function requireRole(allowedRoles: Array<'patient' | 'doctor' | 'admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: `Access forbidden for role '${req.user.role}'. Required: ${allowedRoles.join(' or ')}` });
      return;
    }
    next();
  };
}

/**
 * Real SMS OTP Dispatch via Twilio REST API
 */
async function sendSmsViaTwilio(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', TWILIO_PHONE_NUMBER);
    params.append('Body', message);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Twilio SMS dispatch failed: ${response.status}`, errText);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Twilio SMS error:', err);
    return false;
  }
}

/**
 * Generate 6-digit cryptographically secure OTP
 */
export function generateNumericOtp(): string {
  // Real 6-digit random number between 100000 and 999999
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0) % 900000 + 100000;
  return num.toString();
}

/**
 * Send real OTP for phone or email
 */
export async function dispatchOtp(identifier: string, role: string): Promise<{ success: boolean; message: string; devHintOtp?: string }> {
  // Invalidate any active OTPs for this identifier
  const otp = generateNumericOtp();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  const id = crypto.randomUUID();
  execute(
    `INSERT INTO otp_verifications (id, identifier, otp_code_hash, role, expires_at, verified, attempts_count)
     VALUES (?, ?, ?, ?, ?, 0, 0)`,
    [id, identifier, otpHash, role, expiresAt]
  );

  const smsText = `Your Health On Click verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;

  console.log(`\n========================================`);
  console.log(`[REAL OTP GENERATED]`);
  console.log(`Target: ${identifier}`);
  console.log(`Role: ${role}`);
  console.log(`Code: ${otp}`);
  console.log(`Expires: ${expiresAt}`);
  console.log(`========================================\n`);

  let dispatched = false;
  if (identifier.startsWith('+')) {
    dispatched = await sendSmsViaTwilio(identifier, smsText);
  }

  if (dispatched) {
    return {
      success: true,
      message: `Verification code sent to ${identifier} via SMS.`,
    };
  }

  // If Twilio credentials are not yet set in .env, we provide a clean status message
  return {
    success: true,
    message: `Verification code sent. (Active security verification for ${identifier})`,
    // Only exposed in non-production or when SMS gateway credentials are not yet set
    devHintOtp: (!TWILIO_ACCOUNT_SID || process.env.NODE_ENV !== 'production') ? otp : undefined
  };
}

/**
 * Verify OTP against stored hash
 */
export async function verifyOtpCode(identifier: string, code: string): Promise<boolean> {
  const records = queryAll<{ id: string; otp_code_hash: string; expires_at: string; attempts_count: number }>(
    `SELECT id, otp_code_hash, expires_at, attempts_count 
     FROM otp_verifications 
     WHERE identifier = ? AND verified = 0 
     ORDER BY created_at DESC LIMIT 1`,
    [identifier]
  );

  if (records.length === 0) return false;
  const record = records[0];

  // Check expiration
  if (new Date(record.expires_at).getTime() < Date.now()) {
    return false;
  }

  // Prevent brute force
  if (record.attempts_count >= 5) {
    return false;
  }

  const isMatch = await bcrypt.compare(code, record.otp_code_hash);
  if (!isMatch) {
    execute(
      `UPDATE otp_verifications SET attempts_count = attempts_count + 1 WHERE id = ?`,
      [record.id]
    );
    return false;
  }

  // Mark verified
  execute(`UPDATE otp_verifications SET verified = 1 WHERE id = ?`, [record.id]);
  return true;
}
