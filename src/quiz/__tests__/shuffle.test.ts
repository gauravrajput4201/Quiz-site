import { describe, expect, it } from "vitest";
import { shuffle } from "../utils/shuffleQuestions";

describe("shuffle (Fisher–Yates)", () => {
  it("returns a permutation and does not mutate the input", () => {
    const input = Array.from({ length: 100 }, (_, index) => index + 1);
    const copy = [...input];
    const output = shuffle(input);
    expect(input).toEqual(copy);
    expect([...output].sort((a, b) => a - b)).toEqual(copy);
  });

  it("is deterministic for an injected random source", () => {
    let seed = 42;
    const seeded = () =>
      ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const first = shuffle([1, 2, 3, 4, 5, 6], seeded);
    seed = 42;
    expect(shuffle([1, 2, 3, 4, 5, 6], seeded)).toEqual(first);
  });

  it("is roughly uniform over all 6 permutations of 3 items", () => {
    const counts = new Map<string, number>();
    const runs = 60000;
    for (let i = 0; i < runs; i += 1) {
      const key = shuffle(["a", "b", "c"]).join("");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const count of counts.values()) {
      expect(Math.abs(count - runs / 6)).toBeLessThan(runs * 0.02);
    }
  });
});
