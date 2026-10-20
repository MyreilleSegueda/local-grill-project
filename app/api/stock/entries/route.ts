import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from '@/server/db/prisma';

// GET /api/stock/entries?search=&product_id=&user_id=&startDate=&endDate=&sort=entry_date&order=desc&limit=20&offset=0
export async function GET(req: NextRequest) {
  const {
    search = "",
    product_id = "",
    user_id = "",
    category_id = "",
    startDate = "",
    endDate = "",
    sort = "entry_date",
    order = "desc",
    limit = "20",
    offset = "0"
  } = Object.fromEntries(new URL(req.url).searchParams.entries());

  const where: Prisma.stock_batchesWhereInput = {};
  if (search) {
    where.OR = [
      { batch_number: { contains: search } },
      { notes: { contains: search } },
      { product: { is: { name: { contains: search } } } }
    ];
  }
  if (product_id) where.product_id = Number(product_id);
  if (user_id) where.user_id = Number(user_id);
  if (startDate || endDate) where.entry_date = {
    ...(startDate ? { gte: new Date(startDate) } : {}),
    ...(endDate ? { lte: new Date(endDate) } : {}),
  };
  if (category_id) {
    where.product = { is: { category_id: Number(category_id) } };
  }

  const total = await prisma.stock_batches.count({ where });
  const entries = await prisma.stock_batches.findMany({
    where,
    orderBy: { [sort]: order },
    skip: Number(offset),
    take: Number(limit),
    include: {
      product: { include: { unit: true, category: true } },
      stock_movements: {
        where: { type: "IN" },
        orderBy: { created_at: "asc" },
      },
    },
  });

  // stock_batches.user_id is a scalar; the Prisma schema has no `user` relation.
  // Load creators separately and attach them for the entries UI.
  const userIds = [...new Set(entries.map((entry) => entry.user_id))];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, fullName: true, email: true },
      })
    : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  const entriesWithUser = entries.map((entry) => ({
    ...entry,
    user: usersById.get(entry.user_id) ?? null,
  }));

  return NextResponse.json({ data: { entries: entriesWithUser, total } });
}
