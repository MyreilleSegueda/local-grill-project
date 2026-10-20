import { NextRequest } from "next/server";
import { authorizeKitchen, authorizeKitchenDispatch, authorizePermission } from "../lib/services/kitchenAuth";
import { loadUserWithPermissions, verifyJwt } from "../server/services/authService";

jest.mock("../server/services/authService", () => ({
  loadUserWithPermissions: jest.fn(),
  verifyJwt: jest.fn(),
}));

const mockVerifyJwt = jest.mocked(verifyJwt);
const mockLoadUser = jest.mocked(loadUserWithPermissions);

function request() {
  return new NextRequest("http://localhost/api", {
    headers: { authorization: "Bearer valid-token" },
  });
}

function user(roleNames: string[] = [], permissionNames: string[] = []) {
  return {
    id: 12,
    status: "ACTIVE",
    userRoles: roleNames.map((name) => ({
      role: {
        name,
        rolepermission: permissionNames.map((permission) => ({ permission: { name: permission } })),
      },
    })),
    userpermission: [],
  } as unknown as Awaited<ReturnType<typeof loadUserWithPermissions>>;
}

describe("Cuisine authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyJwt.mockReturnValue({ id: 12, email: "admin@example.test", role: "ADMIN", roles: [], permissions: [] });
  });

  it("grants an ADMIN loaded from the database access to all Cuisine actions", async () => {
    mockLoadUser.mockResolvedValue(user(["ADMIN"]));

    for (const permission of ["CUISINE_VIEW", "CUISINE_SERVE", "CUISINE_RETURN"] as const) {
      await expect(authorizeKitchen(request(), permission)).resolves.toMatchObject({ userId: 12, response: null });
    }
  });

  it("does not let the Cuisine ADMIN exception grant permissions in other modules", async () => {
    mockLoadUser.mockResolvedValue(user(["ADMIN"]));

    const result = await authorizePermission(request(), "SORTIE_STOCK_CREATE");
    expect(result.userId).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  it("allows a database ADMIN to dispatch to Cuisine without widening generic stock permissions", async () => {
    mockLoadUser.mockResolvedValue(user(["ADMIN"]));

    await expect(authorizeKitchenDispatch(request())).resolves.toMatchObject({ userId: 12, response: null });
    const generic = await authorizePermission(request(), "SORTIE_STOCK_CREATE");
    expect(generic.userId).toBeNull();
    expect(generic.response?.status).toBe(403);
  });

  it("requires SORTIE_STOCK_CREATE for a non-admin Cuisine dispatch", async () => {
    mockLoadUser.mockResolvedValue(user(["GESTIONNAIRE"]));

    const result = await authorizeKitchenDispatch(request());
    expect(result.userId).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  it("denies a non-admin without the requested Cuisine permission", async () => {
    mockLoadUser.mockResolvedValue(user(["GESTIONNAIRE"]));

    const result = await authorizeKitchen(request(), "CUISINE_VIEW");
    expect(result.userId).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  it("keeps individual Cuisine permissions available to non-admin users", async () => {
    mockLoadUser.mockResolvedValue(user(["GESTIONNAIRE"], ["CUISINE_SERVE"]));

    await expect(authorizeKitchen(request(), "CUISINE_SERVE")).resolves.toMatchObject({ userId: 12, response: null });
    expect((await authorizeKitchen(request(), "CUISINE_RETURN")).response?.status).toBe(403);
  });
});
