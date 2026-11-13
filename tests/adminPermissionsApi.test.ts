import { NextRequest } from "next/server";
import { GET } from "../app/api/admin/permissions/route";
import { prisma } from "../lib/prisma";
import { verifyJwt } from "../server/services/authService";
import { ALL_PERMISSIONS } from "../lib/constants/permissions";

jest.mock("../lib/prisma", () => ({
  prisma: { permission: { createMany: jest.fn(), findMany: jest.fn() } },
}));
jest.mock("../server/services/authService", () => ({ verifyJwt: jest.fn() }));

const mockCreateMany = prisma.permission.createMany as jest.Mock;
const mockFindMany = prisma.permission.findMany as jest.Mock;
const mockVerifyJwt = jest.mocked(verifyJwt);

describe("GET /api/admin/permissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyJwt.mockReturnValue({ roles: ["ADMIN"] } as ReturnType<typeof verifyJwt>);
    mockCreateMany.mockResolvedValue({ count: ALL_PERMISSIONS.length });
    mockFindMany.mockResolvedValue([]);
  });

  it("initializes every canonical permission so role controls remain selectable", async () => {
    const request = new NextRequest("http://localhost/api/admin/permissions", {
      headers: { authorization: "Bearer admin-token" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: ALL_PERMISSIONS.map((name) => ({ name })),
      skipDuplicates: true,
    });
    expect(mockFindMany).toHaveBeenCalled();
  });

  it("does not seed permissions for unauthenticated callers", async () => {
    const request = new NextRequest("http://localhost/api/admin/permissions");

    const response = await GET(request);

    expect(response.status).toBe(401);
    expect(mockCreateMany).not.toHaveBeenCalled();
  });
});
