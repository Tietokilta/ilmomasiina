/** function that is never allowed to be called, used for enforcing exhausting switch cases */
export function never(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}
