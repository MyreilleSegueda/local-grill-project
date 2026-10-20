import { NextRequest } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";
import { POST } from "../app/api/cuisine/[lineId]/events/route";
import { prisma } from "../lib/prisma";
import { authorizeKitchen } from "../lib/services/kitchenAuth";

jest.mock("../lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("../lib/services/kitchenAuth", () => ({ authorizeKitchen: jest.fn() }));

const mockAuthorize = jest.mocked(authorizeKitchen);
const mockTransaction = prisma.$transaction as jest.Mock;

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/cuisine/7/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function transactionFixture(options: { duplicate?: boolean; remaining?: string } = {}) {
  const tx = {
    $queryRaw: jest.fn()
      .mockResolvedValueOnce([{
        id: 7, dispatch_id: 2, origin_movement_id: 3, product_id: 4, batch_id: 5,
        sent_quantity: new Decimal(10), served_quantity: new Decimal(2), returned_quantity: new Decimal(1),
      }])
      .mockResolvedValueOnce([{ id: 5, quantity_initial: new Decimal(20), quantity_remaining: new Decimal(9) }]),
    kitchen_events: {
      findUnique: jest.fn().mockResolvedValue(options.duplicate ? { id: 99 } : null),
      create: jest.fn().mockResolvedValue({ id: 101 }),
    },
    stock_movements: {
      findUnique: jest.fn().mockResolvedValue({ id: 3, type: "OUT", product_id: 4, batch_id: 5 }),
      create: jest.fn().mockResolvedValue({ id: 102 }),
    },
    stock_batches: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn().mockResolvedValue({}) },
    inventory_snapshots: { upsert: jest.fn().mockResolvedValue({}) },
    kitchen_dispatch_lines: { update: jest.fn().mockResolvedValue({}) },
  };
  mockTransaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
  return tx;
}

describe("POST Cuisine events", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthorize.mockResolvedValue({ userId: 12, response: null });
  });

  it("rejects event types outside SERVED and RETURNED", async () => {
    const response = await POST(makeRequest({ type: "DISCARDED", quantity: 1, operation_key: "x" }), { params: Promise.resolve({ lineId: "7" }) });
    expect(response.status).toBe(400);
    expect(mockAuthorize).not.toHaveBeenCalled();
  });

  it("rejects invalid quantities before opening a transaction", async () => {
    for (const quantity of [0, -1, Number.NaN]) {
      const response = await POST(makeRequest({ type: "SERVED", quantity, operation_key: "invalid" }), { params: Promise.resolve({ lineId: "7" }) });
      expect(response.status).toBe(400);
    }
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("records SERVED without changing stock", async () => {
    const tx = transactionFixture();
    const response = await POST(makeRequest({ type: "SERVED", quantity: 2, operation_key: "serve-1" }), { params: Promise.resolve({ lineId: "7" }) });
    expect(response.status).toBe(201);
    expect(tx.stock_batches.update).not.toHaveBeenCalled();
    expect(tx.stock_movements.create).not.toHaveBeenCalled();
    expect(tx.kitchen_events.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "SERVED", stock_movement_id: null }),
    }));
  });

  it("records RETURNED as one IN movement against the original batch", async () => {
    const tx = transactionFixture();
    const response = await POST(makeRequest({ type: "RETURNED", quantity: 2, operation_key: "return-1" }), { params: Promise.resolve({ lineId: "7" }) });
    expect(response.status).toBe(201);
    expect(tx.stock_batches.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 5 }, data: expect.objectContaining({ quantity_remaining: { increment: expect.anything() } }),
    }));
    expect(tx.stock_movements.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ product_id: 4, batch_id: 5, type: "IN", reason: "Retour Cuisine" }),
    }));
  });

  it("rejects a duplicate return operation key without adding stock again", async () => {
    const tx = transactionFixture({ duplicate: true });
    const response = await POST(makeRequest({ type: "RETURNED", quantity: 2, operation_key: "return-duplicate" }), { params: Promise.resolve({ lineId: "7" }) });
    expect(response.status).toBe(409);
    expect(tx.stock_batches.update).not.toHaveBeenCalled();
    expect(tx.stock_movements.create).not.toHaveBeenCalled();
  });

  it("rejects service or return quantities exceeding the unserved remainder", async () => {
    transactionFixture();
    const response = await POST(makeRequest({ type: "RETURNED", quantity: 8, operation_key: "too-large" }), { params: Promise.resolve({ lineId: "7" }) });
    expect(response.status).toBe(409);
  });
});
