import { NextRequest } from "next/server";
import { GET } from "../app/api/stock/movements/route";
import { prisma } from "../lib/prisma";
import { getUserIdFromRequest } from "../lib/services/auditLogService";

jest.mock("../lib/prisma", () => ({
  prisma: {
    stock_location_movements: { findMany: jest.fn() },
    stock_movements: { count: jest.fn(), findMany: jest.fn() },
    user: { findMany: jest.fn() },
  },
}));
jest.mock("../lib/services/auditLogService", () => ({ getUserIdFromRequest: jest.fn() }));

const mockLocationFindMany = prisma.stock_location_movements.findMany as jest.Mock;
const mockMovementCount = prisma.stock_movements.count as jest.Mock;
const mockMovementFindMany = prisma.stock_movements.findMany as jest.Mock;
const mockUsersFindMany = prisma.user.findMany as jest.Mock;
const mockGetUserId = jest.mocked(getUserIdFromRequest);

function request(query: string) {
  return new NextRequest(`http://localhost/api/stock/movements?${query}`, {
    headers: { authorization: "Bearer test-token" },
  });
}

describe("GET /api/stock/movements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserId.mockReturnValue(7);
    mockLocationFindMany.mockResolvedValue([
      { reference_number: "MAG-STORE-RETURN-1" },
      { reference_number: "MAG-STORE-RETURN-1" },
      { reference_number: null },
    ]);
    mockMovementCount.mockResolvedValue(1);
    mockMovementFindMany.mockResolvedValue([{ id: 12, reference_number: "MAG-STORE-RETURN-1", user_id: 7 }]);
    mockUsersFindMany.mockResolvedValue([{ id: 7, fullName: "Magasinier", email: "store@example.test" }]);
  });

  it("lists only inbound movements linked to an actual Store-to-General transfer", async () => {
    const response = await GET(request("type=IN&source=STORE_RETURN&limit=10&offset=0"));

    expect(response.status).toBe(200);
    expect(mockLocationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ from_location: "STORE", to_location: "GENERAL" }),
      distinct: ["reference_number"],
    }));
    expect(mockMovementCount).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ type: "IN", reference_number: { in: ["MAG-STORE-RETURN-1"] } }),
    }));
    expect(mockMovementFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ type: "IN", reference_number: { in: ["MAG-STORE-RETURN-1"] } }),
    }));
  });

  it("returns no rows and skips stock queries when no Store-to-General movement exists", async () => {
    mockLocationFindMany.mockResolvedValue([]);

    const response = await GET(request("type=IN&source=STORE_RETURN"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual({ total: 0, movements: [] });
    expect(mockMovementCount).not.toHaveBeenCalled();
    expect(mockMovementFindMany).not.toHaveBeenCalled();
  });

  it("keeps historical Cuisine-only movements out of the Store-return source", async () => {
    await GET(request("type=IN&source=STORE_RETURN"));

    expect(mockLocationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { from_location: "STORE", to_location: "GENERAL", reference_number: { not: null } },
    }));
    expect(mockMovementFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.not.objectContaining({ reason: { contains: "Retour Cuisine" } }),
    }));
  });
});
