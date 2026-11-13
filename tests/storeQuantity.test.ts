import { formatQuantity, addQuantities, isPositiveQuantity, subtractQuantities } from "../lib/utils/decimalQuantity";
import { parseStoreQuantity } from "../lib/services/storeQuantity";

describe("Magasin decimal quantities", () => {
  it("adds, subtracts and formats quantities without floating-point artifacts", () => {
    expect(addQuantities("1.5", "0.5")).toBe("2");
    expect(addQuantities("1.25", "0.5")).toBe("1.75");
    expect(subtractQuantities("2", "0.5")).toBe("1.5");
    expect(subtractQuantities("2.25", "2")).toBe("0.25");
    expect(subtractQuantities("1.99", "2")).toBe("0");
    expect(formatQuantity("2.000001")).toBe("2,000001");
    expect(formatQuantity("1.990001")).toBe("1,990001");
    expect(formatQuantity("1234.25")).toBe("1 234,25");
  });

  it("keeps precise quantities as decimals and rejects invalid or over-precision values", () => {
    expect(parseStoreQuantity("2")?.toString()).toBe("2");
    expect(parseStoreQuantity("2.5")?.toString()).toBe("2.5");
    expect(parseStoreQuantity("2,25")?.toString()).toBe("2.25");
    expect(parseStoreQuantity("0.5")?.toString()).toBe("0.5");
    expect(parseStoreQuantity("0.1234567890123456789012345678901")).toBeNull();
    expect(parseStoreQuantity(`${"9".repeat(36)}`)).toBeNull();
    expect(parseStoreQuantity("not-a-number")).toBeNull();
    expect(isPositiveQuantity("")).toBe(false);
    expect(isPositiveQuantity("0.5")).toBe(true);
  });
});
