import { NextRequest } from "next/server";
import { Decimal } from "@prisma/client/runtime/library";
import { POST as transferFromStore, POST as returnStoreStock } from "../app/api/store/route";
import { POST as requestKitchenReturn } from "../app/api/cuisine/[lineId]/returns/route";
import { POST as receiveKitchenReturn } from "../app/api/store/returns/[requestId]/route";
import { prisma } from "../lib/prisma";
import { authorizeKitchen, authorizeStore } from "../lib/services/kitchenAuth";

jest.mock("../lib/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
jest.mock("../lib/services/kitchenAuth", () => ({
  authorizeKitchen: jest.fn(),
  authorizeStore: jest.fn(),
}));
jest.mock("../lib/services/inventoryService", () => ({ updateInventorySnapshot: jest.fn() }));

const mockTransaction = prisma.$transaction as jest.Mock;
const mockKitchenAuth = jest.mocked(authorizeKitchen);
const mockStoreAuth = jest.mocked(authorizeStore);

function request(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer token" },
    body: JSON.stringify(body),
  });
}

function transactionFixture() {
  const tx = {
    $queryRaw: jest.fn(),
    stock_location_balances: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      upsert: jest.fn().mockResolvedValue({}),
    },
    stock_location_movements: { create: jest.fn().mockResolvedValue({ id: 501 }) },
    stock_batches: { update: jest.fn().mockResolvedValue({}) },
    stock_movements: { create: jest.fn().mockResolvedValue({ id: 502 }) },
    kitchen_dispatches: { create: jest.fn().mockResolvedValue({ id: 20 }) },
    kitchen_dispatch_lines: { create: jest.fn().mockResolvedValue({ id: 30 }), update: jest.fn() },
    kitchen_return_requests: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 40, status: "PENDING" }),
      update: jest.fn().mockResolvedValue({ id: 40, status: "RECEIVED" }),
    },
    kitchen_events: { create: jest.fn().mockResolvedValue({ id: 60 }) },
  };
  mockTransaction.mockImplementation(async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
  return tx;
}

describe("Magasin stock flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKitchenAuth.mockResolvedValue({ userId: 7, response: null });
    mockStoreAuth.mockResolvedValue({ userId: 8, response: null });
  });

  it("transfers FIFO Magasin lots into Cuisine with original batch provenance", async () => {
    const tx = transactionFixture();
    tx.$queryRaw.mockResolvedValue([{
      id: 9, batch_id: 5, quantity: new Decimal(2), entry_date: new Date("2026-01-01"),
      quantity_initial: new Decimal(10), quantity_remaining: new Decimal(0),
    }]);

    const response = await transferFromStore(
      request("http://localhost/api/store", { product_id: 4, quantity: "2", destination: "CUISINE" }),
    );

    expect(response.status).toBe(201);
    expect(mockStoreAuth).toHaveBeenCalledWith(expect.any(NextRequest), "STORE_TRANSFER");
    expect(tx.stock_location_balances.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ batch_id: 5, location: "STORE", quantity: { gte: new Decimal(2) } }),
    }));
    expect(tx.stock_location_balances.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ batch_id: 5, location: "CUISINE", quantity: new Decimal(2) }),
    }));
    expect(tx.stock_location_movements.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ batch_id: 5, from_location: "STORE", to_location: "CUISINE" }),
    }));
    expect(tx.kitchen_dispatch_lines.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ batch_id: 5, origin_location_movement_id: 501, sent_quantity: new Decimal(2) }),
    }));
  });

  it("preserves exact integer and fractional quantities when transferring from Magasin", async () => {
    const tx = transactionFixture();
    tx.$queryRaw.mockResolvedValue([{
      id: 9, batch_id: 5, quantity: new Decimal("2.25"), entry_date: new Date("2026-01-01"),
      quantity_initial: new Decimal(10), quantity_remaining: new Decimal(0),
    }]);

    const response = await transferFromStore(
      request("http://localhost/api/store", { product_id: 4, quantity: "2.25", destination: "CUISINE" }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.quantity).toBe("2.25");
    expect(tx.stock_location_balances.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { quantity: { decrement: new Decimal("2.25") }, updated_at: expect.any(Date) },
    }));
    expect(tx.stock_location_balances.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ quantity: new Decimal("2.25") }),
    }));
    expect(tx.kitchen_dispatch_lines.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ sent_quantity: new Decimal("2.25") }),
    }));
  });

  it("rejects a transfer just above the exact available balance", async () => {
    const tx = transactionFixture();
    tx.$queryRaw.mockResolvedValue([{
      id: 9, batch_id: 5, quantity: new Decimal("1.99"), entry_date: new Date("2026-01-01"),
      quantity_initial: new Decimal(10), quantity_remaining: new Decimal(0),
    }]);

    const response = await transferFromStore(
      request("http://localhost/api/store", { product_id: 4, quantity: "2", destination: "CUISINE" }),
    );

    expect(response.status).toBe(409);
    expect(tx.stock_location_balances.updateMany).not.toHaveBeenCalled();
  });

  it("returns Magasin stock to the original general-stock lot", async () => {
    const tx = transactionFixture();
    tx.$queryRaw.mockResolvedValue([{
      id: 9, batch_id: 5, quantity: new Decimal(4), entry_date: new Date("2026-01-01"),
      quantity_initial: new Decimal(10), quantity_remaining: new Decimal(2),
    }]);

    const response = await returnStoreStock(
      request("http://localhost/api/store", { product_id: 4, quantity: 2, destination: "STOCK" }),
    );
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(mockStoreAuth).toHaveBeenCalledWith(expect.any(NextRequest), "STORE_RETURN_STOCK");
    expect(tx.stock_batches.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 5 },
      data: expect.objectContaining({ quantity_remaining: { increment: new Decimal(2) } }),
    }));
    expect(tx.stock_movements.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ product_id: 4, batch_id: 5, type: "IN", quantity: new Decimal(2) }),
    }));
    expect(tx.stock_location_movements.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        from_location: "STORE",
        to_location: "GENERAL",
        batch_id: 5,
        reference_number: json.data.reference,
        reason: "Retour Magasin vers le stock général",
      }),
    }));
    expect(tx.stock_movements.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: "IN",
        reference_number: json.data.reference,
        reason: "Retour Magasin vers le stock général",
      }),
    }));
  });

  it("records a Cuisine return request without crediting Magasin before reception", async () => {
    const tx = transactionFixture();
    tx.$queryRaw
      .mockResolvedValueOnce([{
        id: 30, product_id: 4, batch_id: 5, sent_quantity: new Decimal(10),
        served_quantity: new Decimal(3), returned_quantity: new Decimal(1),
      }])
      .mockResolvedValueOnce([{ quantity: new Decimal(6) }]);

    const response = await requestKitchenReturn(
      request("http://localhost/api/cuisine/30/returns", { quantity: 2, operation_key: "return-test-1" }),
      { params: Promise.resolve({ lineId: "30" }) },
    );

    expect(response.status).toBe(201);
    expect(mockKitchenAuth).toHaveBeenCalledWith(expect.any(NextRequest), "CUISINE_RETURN");
    expect(tx.kitchen_return_requests.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ batch_id: 5, quantity: new Decimal(2), operation_key: "return-test-1" }),
    }));
    expect(tx.stock_location_balances.updateMany).not.toHaveBeenCalled();
    expect(tx.stock_location_balances.upsert).not.toHaveBeenCalled();
    expect(tx.stock_location_movements.create).not.toHaveBeenCalled();
    expect(tx.kitchen_events.create).not.toHaveBeenCalled();
  });

  it("moves only the validated quantity from Cuisine into Magasin on receipt", async () => {
    const tx = transactionFixture();
    tx.$queryRaw
      .mockResolvedValueOnce([{
        id: 40, dispatch_line_id: 30, product_id: 4, batch_id: 5,
        quantity: new Decimal(3), received_quantity: new Decimal(0),
        status: "PENDING", operation_key: "return-test-2",
      }])
      .mockResolvedValueOnce([{ id: 12 }]);

    const response = await receiveKitchenReturn(
      request("http://localhost/api/store/returns/40", { quantity: "2" }),
      { params: Promise.resolve({ requestId: "40" }) },
    );

    expect(response.status).toBe(200);
    expect(mockStoreAuth).toHaveBeenCalledWith(expect.any(NextRequest), "STORE_RECEIVE");
    expect(tx.stock_location_balances.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ batch_id: 5, location: "CUISINE" }),
    }));
    expect(tx.stock_location_balances.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ batch_id: 5, location: "STORE", quantity: new Decimal(2) }),
    }));
    expect(tx.stock_location_movements.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        from_location: "CUISINE",
        to_location: "STORE",
        batch_id: 5,
        return_request_id: 40,
      }),
    }));
    expect(tx.kitchen_dispatch_lines.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { returned_quantity: { increment: new Decimal(2) } },
    }));
    expect(tx.kitchen_events.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "RETURNED", quantity: new Decimal(2) }),
    }));
  });

  it("receives a partial decimal quantity exactly and keeps the remaining request precise", async () => {
    const tx = transactionFixture();
    tx.$queryRaw
      .mockResolvedValueOnce([{
        id: 40, dispatch_line_id: 30, product_id: 4, batch_id: 5,
        quantity: new Decimal("2"), received_quantity: new Decimal(0),
        status: "PENDING", operation_key: "return-test-partial",
      }])
      .mockResolvedValueOnce([{ id: 12 }]);

    const response = await receiveKitchenReturn(
      request("http://localhost/api/store/returns/40", { quantity: "0.5" }),
      { params: Promise.resolve({ requestId: "40" }) },
    );

    expect(response.status).toBe(200);
    expect(tx.stock_location_balances.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ location: "CUISINE" }),
      data: { quantity: { decrement: new Decimal("0.5") }, updated_at: expect.any(Date) },
    }));
    expect(tx.stock_location_balances.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ quantity: new Decimal("0.5") }),
    }));
    expect(tx.kitchen_return_requests.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ received_quantity: new Decimal("0.5"), status: "PARTIAL" }),
    }));
  });

  it("requires an explicit inspected quantity before accepting a return", async () => {
    const response = await receiveKitchenReturn(
      request("http://localhost/api/store/returns/40", {}),
      { params: Promise.resolve({ requestId: "40" }) },
    );
    expect(response.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
