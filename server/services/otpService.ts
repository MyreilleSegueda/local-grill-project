import { prisma } from '@/server/db/prisma';
import bcrypt from 'bcryptjs';

export async function createOtp(userId: number, code: string, expiresAt: Date) {
  const codeHash = await bcrypt.hash(code, 12);
  return prisma.otpcode.create({
    data: { userId, codeHash, expiresAt },
  });
}

export async function verifyOtp(userId: number, code: string) {
  const otp = await prisma.otpcode.findFirst({
    where: { userId, expiresAt: { gte: new Date() } },
    orderBy: { expiresAt: 'desc' },
  });
  if (!otp) return false;
  const valid = await bcrypt.compare(code, otp.codeHash);
  if (valid) await prisma.otpcode.delete({ where: { id: otp.id } });
  return valid;
}
