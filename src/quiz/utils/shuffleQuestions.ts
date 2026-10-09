export type RandomSource = () => number;

/**
 * Unbiased Fisher–Yates shuffle. Returns a new array; the input is untouched.
 * `random` is injectable for deterministic tests.
 */
export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = result[index] as T;
    result[index] = result[swapIndex] as T;
    result[swapIndex] = current;
  }
  return result;
}

export function shuffleQuestionIds<T>(questionIds: readonly T[], random?: RandomSource): T[] {
  return shuffle(questionIds, random);
}
