import { prisma } from '@/server/db/prisma'

export async function createSession(
  userId: number,
  token: string,
  expiresAt: Date
) {
  return prisma.session.create({
    data: {
      userId,
      token, // ✅ correspond au schema
      expiresAt,
    },
  })
}

export async function getSessionById(sessionId: number) {
  return prisma.session.findUnique({
    where: { id: sessionId },
  })
}