import { isKitchenEventType, kitchenOperationFits, kitchenRemaining, kitchenStatus } from "../lib/services/kitchenRules";

describe("Cuisine quantity rules", () => {
  it("allows a partial return only from the unserved remainder", () => {
    expect(kitchenRemaining("10", "6", "1").toString()).toBe("3");
    expect(kitchenOperationFits("10", "6", "1", "3")).toBe(true);
    expect(kitchenOperationFits("10", "6", "1", "3.01")).toBe(false);
  });

  it("allows a full return when nothing was served", () => {
    expect(kitchenOperationFits("5", "0", "0", "5")).toBe(true);
    expect(kitchenRemaining("5", "0", "5").toString()).toBe("0");
  });

  it("accepts only the two supported Cuisine event types", () => {
    expect(isKitchenEventType("SERVED")).toBe(true);
    expect(isKitchenEventType("RETURNED")).toBe(true);
    expect(isKitchenEventType("DISCARDED")).toBe(false);
    expect(isKitchenEventType(undefined)).toBe(false);
  });

  it("rejects zero, negative, and over-remainder operations for service and returns", () => {
    for (const type of ["SERVED", "RETURNED"] as const) {
      expect(isKitchenEventType(type)).toBe(true);
      expect(kitchenOperationFits("10", "6", "1", "0")).toBe(false);
      expect(kitchenOperationFits("10", "6", "1", "-1")).toBe(false);
      expect(kitchenOperationFits("10", "6", "1", "4")).toBe(false);
    }
  });

  it("prevents a second return after the remaining quantity has already been returned", () => {
    expect(kitchenOperationFits("5", "1", "4", "1")).toBe(false);
    expect(kitchenRemaining("5", "1", "4").toString()).toBe("0");
  });

  it("derives the three agreed service statuses", () => {
    expect(kitchenStatus("5", "0")).toBe("EN_ATTENTE");
    expect(kitchenStatus("5", "2")).toBe("PARTIELLEMENT_SERVI");
    expect(kitchenStatus("5", "5")).toBe("ENTIREMENT_SERVI");
  });
});
