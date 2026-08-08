import { useRef } from "react";

/**
 * Modified from https://github.com/reduxjs/react-redux/blob/master/src/utils/shallowEqual.ts
 * @copyright 2015-present Dan Abramov
 * @license MIT
 */
function shallowEqual(a: unknown, b: unknown) {
  if (Object.is(a, b)) return true;

  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!Object.hasOwn(b, key) || !Object.is(a[key as keyof typeof a], b[key as keyof typeof b])) return false;
  }
  return true;
}

/** Returns the given object. Returns a previously used object, if shallow-equal to the current one. */
export default function useShallowMemo<T>(value: T): T {
  const ref = useRef<T>(undefined);
  // eslint-disable-next-line react-hooks/refs
  if (!shallowEqual(ref.current, value)) ref.current = value;
  // eslint-disable-next-line react-hooks/refs
  return ref.current as T;
}
