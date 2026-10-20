import { prisma } from '@/server/db/prisma'
import bcrypt from 'bcryptjs'
import { user_status as UserStatus } from '@prisma/client'

export async function getAdminUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  })
}

export async function createAdminUser(data: {
  email: string
  password: string
  fullName: string
  roleId: number
}) {
  const passwordHash = await bcrypt.hash(data.password, 12)

  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      status: UserStatus.ACTIVE,

      // relation via table pivot
      userRoles: {
        create: {
          roleId: data.roleId,
        },
      },
    },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  })
}

export async function updateAdminUser(
  id: number,
  data: Partial<{
    email: string
    password: string
    fullName: string
    status: UserStatus
  }>
) {
  const updateData: any = {}

  if (data.email) updateData.email = data.email
  if (data.fullName) updateData.fullName = data.fullName
  if (data.status) updateData.status = data.status

  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12)
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
  })
}

export async function getAllAdminUsers() {
  return prisma.user.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            name: 'ADMIN',
          },
        },
      },
    },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  })
}

export async function blockAdminUser(id: number, blocked: boolean) {
  return prisma.user.update({
    where: { id },
    data: {
      status: blocked ? UserStatus.INACTIVE : UserStatus.ACTIVE,
    },
  })
}
