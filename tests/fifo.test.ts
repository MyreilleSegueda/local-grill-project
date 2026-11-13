import { allocateFifo } from "../lib/services/fifo";

describe("FIFO allocation", () => {
  const candidates = [
    { id: 2, entry_date: new Date("2026-02-02"), quantity: "5" },
    { id: 1, entry_date: new Date("2026-02-01"), quantity: "3" },
    { id: 3, entry_date: new Date("2026-02-03"), quantity: "4" },
  ];

  it("allocates oldest lots first and splits partial quantities across lots", () => {
    const allocations = allocateFifo(candidates, "6");
    expect(allocations.map(({ batch, quantity }) => [batch.id, quantity.toString()])).toEqual([
      [1, "3"],
      [2, "3"],
    ]);
  });

  it("uses the batch id to make equal-date ordering deterministic", () => {
    const allocations = allocateFifo([
      { id: 3, entry_date: new Date("2026-02-01"), quantity: "1" },
      { id: 2, entry_date: new Date("2026-02-01"), quantity: "1" },
    ], "1");
    expect(allocations[0].batch.id).toBe(2);
  });

  it("rejects quantities exceeding all available lots", () => {
    expect(() => allocateFifo(candidates, "13")).toThrow("INSUFFICIENT_STOCK");
  });
});
