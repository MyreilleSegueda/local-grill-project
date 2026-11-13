import { NextRequest } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";
import { POST } from "../app/api/cuisine/[lineId]/events/route";
import { prisma } from "../lib/prisma";
import { authorizeKitchen } from "../lib/services/kitchenAuth";
import { changeLocationBalance } from "../lib/services/stockLocationService";

jest.mock("../lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("../lib/services/kitchenAuth", () => ({ authorizeKitchen: jest.fn() }));
jest.mock("../lib/services/stockLocationService", () => ({ changeLocationBalance: jest.fn() }));

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
    $queryRaw: jest.fn().mockResolvedValueOnce([{
        id: 7, dispatch_id: 2, origin_movement_id: 3, product_id: 4, batch_id: 5,
        sent_quantity: new Decimal(10), served_quantity: new Decimal(2), returned_quantity: new Decimal(1),
      }]),
    kitchen_events: {
      findUnique: jest.fn().mockResolvedValue(options.duplicate ? { id: 99 } : null),
      create: jest.fn().mockResolvedValue({ id: 101 }),
    },
    kitchen_return_requests: { findMany: jest.fn().mockResolvedValue([]) },
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

  it("records SERVED and debits Cuisine stock without changing general stock", async () => {
    const tx = transactionFixture();
    const response = await POST(makeRequest({ type: "SERVED", quantity: 2, operation_key: "serve-1" }), { params: Promise.resolve({ lineId: "7" }) });
    expect(response.status).toBe(201);
    expect(changeLocationBalance).toHaveBeenCalledWith(tx, 5, "CUISINE", new Decimal(2).negated());
    expect(tx.kitchen_events.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "SERVED", stock_movement_id: null }),
    }));
  });

  it("requires returns to be submitted as Magasin requests", async () => {
    const response = await POST(makeRequest({ type: "RETURNED", quantity: 2, operation_key: "return-1" }), { params: Promise.resolve({ lineId: "7" }) });
    expect(response.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects service quantities exceeding the unserved remainder", async () => {
    transactionFixture();
    const response = await POST(makeRequest({ type: "SERVED", quantity: 8, operation_key: "too-large" }), { params: Promise.resolve({ lineId: "7" }) });
    expect(response.status).toBe(409);
  });
});
