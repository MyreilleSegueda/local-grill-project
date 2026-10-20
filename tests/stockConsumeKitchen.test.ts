import { NextRequest, NextResponse } from "next/server";
import { POST } from "../app/api/stock/consume/route";
import { prisma } from "../lib/prisma";
import { authorizeKitchenDispatch, authorizeStockExit } from "../lib/services/kitchenAuth";

jest.mock("../lib/prisma", () => ({
  prisma: {
    stock_batches: { aggregate: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("../lib/services/kitchenAuth", () => ({
  authorizeKitchenDispatch: jest.fn(),
  authorizeStockExit: jest.fn(),
}));
jest.mock("../lib/services/inventoryService", () => ({ updateInventorySnapshot: jest.fn() }));
jest.mock("../lib/services/auditLogService", () => ({ auditStock: { createExit: jest.fn() } }));

const mockCuisineAuth = jest.mocked(authorizeKitchenDispatch);
const mockStockExitAuth = jest.mocked(authorizeStockExit);
const mockAggregate = prisma.stock_batches.aggregate as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

function request(destination: "CUISINE" | "STORE") {
  return new NextRequest("http://localhost/api/stock/consume", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test" },
    body: JSON.stringify({ product_id: 4, quantity: 3, type: "OUT", destination, reason: "Test" }),
  });
}

function transactionFixture() {
  const tx = {
    stock_batches: {
      findMany: jest.fn().mockResolvedValue([{ id: 5, quantity_remaining: 10 }]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    stock_movements: {
      create: jest.fn().mockResolvedValue({ id: 77 }),
      findMany: jest.fn().mockResolvedValue([{ id: 77, product_id: 4, batch_id: 5, quantity: 3, type: "OUT" }]),
    },
    kitchen_dispatches: { create: jest.fn().mockResolvedValue({ id: 88 }) },
    kitchen_dispatch_lines: { create: jest.fn().mockResolvedValue({ id: 99 }) },
  };
  mockAggregate.mockResolvedValue({ _sum: { quantity_remaining: 10 } });
  mockTransaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
  return tx;
}

describe("POST stock consume Cuisine authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCuisineAuth.mockResolvedValue({ userId: 1, response: null });
    mockStockExitAuth.mockResolvedValue({ userId: 1, response: null });
  });

  it("allows the Cuisine-specific ADMIN authorization and records the FIFO debit and dispatch atomically", async () => {
    const tx = transactionFixture();
    const response = await POST(request("CUISINE"));

    expect(response.status).toBe(200);
    expect(mockCuisineAuth).toHaveBeenCalledTimes(1);
    expect(mockStockExitAuth).not.toHaveBeenCalled();
    expect(tx.stock_batches.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.stock_movements.create).toHaveBeenCalledTimes(1);
    expect(tx.kitchen_dispatches.create).toHaveBeenCalledTimes(1);
    expect(tx.kitchen_dispatch_lines.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ origin_movement_id: 77, product_id: 4, batch_id: 5, sent_quantity: 3 }),
    }));
  });

  it("refuses a Cuisine dispatch when the server authorization denies the user", async () => {
    const denied = NextResponse.json({ error: "Permission requise" }, { status: 403 });
    mockCuisineAuth.mockResolvedValue({ userId: null, response: denied });

    const response = await POST(request("CUISINE"));
    expect(response.status).toBe(403);
    expect(mockStockExitAuth).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("keeps STORE exits on the generic SORTIE_STOCK_CREATE permission", async () => {
    const denied = NextResponse.json({ error: "Permission requise" }, { status: 403 });
    mockStockExitAuth.mockResolvedValue({ userId: null, response: denied });

    const response = await POST(request("STORE"));
    expect(response.status).toBe(403);
    expect(mockStockExitAuth).toHaveBeenCalledWith(expect.any(NextRequest));
    expect(mockCuisineAuth).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
