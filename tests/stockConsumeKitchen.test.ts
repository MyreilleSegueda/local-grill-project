import { NextRequest, NextResponse } from "next/server";
import { POST } from "../app/api/stock/consume/route";
import { prisma } from "../lib/prisma";
import { authorizeStockExit } from "../lib/services/kitchenAuth";
import { changeLocationBalance, recordLocationMovement } from "../lib/services/stockLocationService";
import { Decimal } from "@prisma/client/runtime/library";

jest.mock("../lib/prisma", () => ({
  prisma: {
    stock_batches: { aggregate: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("../lib/services/kitchenAuth", () => ({ authorizeStockExit: jest.fn() }));
jest.mock("../lib/services/inventoryService", () => ({ updateInventorySnapshot: jest.fn() }));
jest.mock("../lib/services/auditLogService", () => ({ auditStock: { createExit: jest.fn() } }));
jest.mock("../lib/services/stockLocationService", () => ({
  changeLocationBalance: jest.fn(),
  recordLocationMovement: jest.fn(),
}));

const mockStockExitAuth = jest.mocked(authorizeStockExit);
const mockAggregate = prisma.stock_batches.aggregate as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

function request(destination: "OTHER" | "STORE" | "CUISINE", quantity = 3) {
  return new NextRequest("http://localhost/api/stock/consume", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer test" },
    body: JSON.stringify({ product_id: 4, quantity, type: "OUT", destination, reason: "Test" }),
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
    stock_location_balances: { upsert: jest.fn().mockResolvedValue({}) },
    stock_location_movements: { create: jest.fn().mockResolvedValue({ id: 101 }) },
    kitchen_dispatches: { create: jest.fn().mockResolvedValue({ id: 88 }) },
    kitchen_dispatch_lines: { create: jest.fn().mockResolvedValue({ id: 99 }) },
  };
  mockAggregate.mockResolvedValue({ _sum: { quantity_remaining: 10 } });
  mockTransaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
  return tx;
}

describe("POST stock consume and Magasin transfer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStockExitAuth.mockResolvedValue({ userId: 1, response: null });
  });

  it("transfers FIFO lots from general stock to Magasin without creating a Cuisine dispatch", async () => {
    const tx = transactionFixture();
    const response = await POST(request("STORE"));

    expect(response.status).toBe(200);
    expect(mockStockExitAuth).toHaveBeenCalledTimes(1);
    expect(tx.stock_batches.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.stock_movements.create).toHaveBeenCalledTimes(1);
    expect(changeLocationBalance).toHaveBeenCalledWith(tx, 5, "STORE", expect.anything());
    expect(recordLocationMovement).toHaveBeenCalledWith(tx, expect.objectContaining({
      from_location: "GENERAL", to_location: "STORE", product_id: 4, batch_id: 5, quantity: expect.anything(),
    }));
    expect(tx.kitchen_dispatches.create).not.toHaveBeenCalled();
  });

  it("enters an exact 2 kg quantity into Magasin from general stock", async () => {
    const tx = transactionFixture();
    const response = await POST(request("STORE", 2));

    expect(response.status).toBe(200);
    expect(changeLocationBalance).toHaveBeenCalledWith(tx, 5, "STORE", new Decimal(2));
    expect(recordLocationMovement).toHaveBeenCalledWith(tx, expect.objectContaining({
      from_location: "GENERAL",
      to_location: "STORE",
      quantity: new Decimal(2),
    }));
  });

  it("rejects direct general-stock transfers to Cuisine", async () => {
    const response = await POST(request("CUISINE"));
    expect(response.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("keeps permanent exits on the generic SORTIE_STOCK_CREATE permission", async () => {
    const denied = NextResponse.json({ error: "Permission requise" }, { status: 403 });
    mockStockExitAuth.mockResolvedValue({ userId: null, response: denied });

    const response = await POST(request("OTHER"));
    expect(response.status).toBe(403);
    expect(mockStockExitAuth).toHaveBeenCalledWith(expect.any(NextRequest));
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
