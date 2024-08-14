interface Options<A, R> {
  /** Maximum number of milliseconds since start of call that a result can be reused. */
  maxAgeMs: number;
  /** Maximum number of milliseconds since start of call that a pending promise can be reused. */
  maxPendingAgeMs?: number;
  /** Maximum number of cache entries to persist. Least recently used entries are evicted. */
  maxSize?: number;
  /** If not set to true, the cache will be disabled in testing. */
  allowTesting?: boolean;
  /** The actual implementation of the cached function. */
  get(key: A): Promise<R>;
}

interface Ongoing<R> {
  promise: Promise<R>;
  created: number;
  state: "running" | "success" | "error";
}

interface CachedGet<A, R> {
  (key: A): Promise<R>;
  invalidate(key?: A): void;
}

/**
 * Wraps the `get` function in a cache.
 *
 * Calls to the returned function within `maxPendingAgeMs` will reuse the same call to `get`, and the result will be
 * reused within `maxAgeMs` of the call starting (not returning).
 *
 * Only the latest `maxSize` keys are preserved in the cache.
 */
export default function createCache<A, R>({
  maxAgeMs,
  maxPendingAgeMs = maxAgeMs,
  maxSize = 128,
  allowTesting = false,
  get,
}: Options<A, R>) {
  // Disable cache when in testing.
  if (process.env.NODE_ENV === "test" && !allowTesting) {
    const dummyGet = ((key: A) => get(key)) as CachedGet<A, R>;
    dummyGet.invalidate = () => {};
    return dummyGet;
  }

  const cache = new Map<A, Ongoing<R>>();

  const cachedGet = (async (key: A) => {
    const currentGet = cache.get(key);

    // Reuse successful and pending queries as described above.
    if (
      currentGet &&
      ((currentGet.state === "running" && currentGet.created > Date.now() - maxPendingAgeMs) ||
        (currentGet.state === "success" && currentGet.created > Date.now() - maxAgeMs))
    ) {
      return currentGet.promise;
    }

    const newGet: Ongoing<R> = {
      promise: get(key).then(
        (result) => {
          newGet.state = "success";
          return result;
        },
        (error) => {
          newGet.state = "error";
          throw error;
        },
      ),
      created: Date.now(),
      state: "running",
    };
    // Delete, then set, to ensure the key is bumped to the end.
    cache.delete(key);
    cache.set(key, newGet);

    // Delete least-recently-used entries.
    if (cache.size > maxSize) {
      const extraKeys = Array.from(cache.keys()).slice(0, cache.size - maxSize);
      for (const extraKey of extraKeys) cache.delete(extraKey);
    }

    return newGet.promise;
  }) as CachedGet<A, R>;

  cachedGet.invalidate = (key) => {
    if (key) cache.delete(key);
    else cache.clear();
  };

  return cachedGet;
}
