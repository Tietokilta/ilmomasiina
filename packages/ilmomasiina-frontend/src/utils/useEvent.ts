import { useCallback, useLayoutEffect, useRef } from "react";

/** Works like useCallback, but always returns a stable callback.
 *
 * Only use the returned callback in event listeners, NEVER in effects, due to how the timing works:
 * https://github.com/facebook/react/issues/16956#issuecomment-536636418
 */
export default function useEvent<T extends (...args: never[]) => unknown>(func: T): T {
  const ref = useRef(func);

  useLayoutEffect(() => {
    ref.current = func;
  }, [func]);

  return useCallback((...args: Parameters<T>) => ref.current(...args), []) as T;
}
