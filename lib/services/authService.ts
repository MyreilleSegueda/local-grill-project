import { prisma } from '@/server/db/prisma'
import bcrypt from 'bcryptjs'
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken'
import { loginSchema, registerSchema } from '../validators'
import { env } from '../env'
import type { user as PrismaUser } from '@prisma/client'

/**
 * Utilisateur exposé publiquement (sans password)
 */
export type UserPublic = Omit<PrismaUser, 'passwordHash'>

/**
 * Payload JWT
 */
interface JwtPayload {
  id: number
  email: string
}

/**
 * Résultat login
 */
export interface LoginResult {
  token: string
  user: UserPublic
}

/**
 * Signature JWT
 */
function signJwt(payload: JwtPayload): string {
  if (!env.jwt.secret) {
    throw new Error('JWT secret is not defined')
  }

  const secret: Secret = env.jwt.secret

  const options: SignOptions = {
    expiresIn: (env.jwt.expiresIn || '8h') as SignOptions['expiresIn'],
  }

  return jwt.sign(payload, secret, options)
}

/**
 * LOGIN
 */
export async function login(input: unknown): Promise<LoginResult> {
  const { email, password } = loginSchema.parse(input)

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || user.status !== 'ACTIVE') {
    throw new Error('Invalid credentials')
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)

  if (!isValid) {
    throw new Error('Invalid credentials')
  }

  const { passwordHash, ...userWithoutPassword } = user

  const token = signJwt({
    id: user.id,
    email: user.email,
  })

  return {
    token,
    user: userWithoutPassword,
  }
}

/**
 * REGISTER
 */
export async function register(input: unknown): Promise<UserPublic> {
  const { email, password, full_name } = registerSchema.parse(input)

  const existing = await prisma.user.findUnique({
    where: { email },
  })

  if (existing) {
    throw new Error('User already exists')
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: full_name,
      status: 'ACTIVE',
    },
  })

  const { passwordHash: _, ...userWithoutPassword } = user

  return userWithoutPassword
}

/**
 * GET USER BY ID
 */
export async function getUserById(id: number): Promise<UserPublic | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  })

  if (!user) return null

  const { passwordHash, ...userWithoutPassword } = user
  return userWithoutPassword
}

/**
 * UPDATE PASSWORD
 */
export async function updatePassword(
  userId: number,
  newPassword: string
): Promise<boolean> {
  const passwordHash = await bcrypt.hash(newPassword, 12)

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      updatedAt: new Date(),
    },
  })

  return true
}

/**
 * DEACTIVATE USER
 */
export async function deactivateUser(userId: number): Promise<boolean> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'INACTIVE',
      updatedAt: new Date(),
    },
  })

  return true
}

/**
 * GET ALL USERS
 */
export async function getAllUsers(): Promise<UserPublic[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  })

  return users.map(({ passwordHash, ...rest }) => rest)
}
