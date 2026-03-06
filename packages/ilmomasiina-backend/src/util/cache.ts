import debug from "debug";

const perfLog = debug("app:perf:cache");

interface Options<A, K, R> {
  /** Maximum number of milliseconds since start of call that a result can be reused. */
  maxAgeMs: number;
  /** Maximum number of milliseconds since start of call that a pending promise can be reused. */
  maxPendingAgeMs?: number;
  /** Maximum number of cache entries to persist. Least recently used entries are evicted. */
  maxSize?: number;
  /** If not set to true, the cache will be disabled in testing. */
  allowTesting?: boolean;
  /** If set, used to log cache usage statistics. */
  logName?: string;
  /** The actual implementation of the cached function. */
  get(key: A): Promise<R>;
  /** If set, used to convert arguments to a cache key. */
  formatKey?: (key: A) => K;
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
export default function createCache<A, K, R>({
  maxAgeMs,
  maxPendingAgeMs = maxAgeMs,
  maxSize = 128,
  allowTesting = false,
  logName,
  get,
  formatKey = (key) => key as unknown as K,
}: Options<A, K, R>) {
  // Disable cache when in testing.
  if (process.env.NODE_ENV === "test" && !allowTesting) {
    const dummyGet = ((key: A) => get(key)) as CachedGet<A, R>;
    dummyGet.invalidate = () => {};
    return dummyGet;
  }

  const cache = new Map<K, Ongoing<R>>();

  let requestCount = 0;
  let hitCount = 0;

  const cachedGet = (async (key: A) => {
    const formattedKey = formatKey(key);
    const currentGet = cache.get(formattedKey);

    // Log cache usage statistics every 25 requests.
    if (logName && requestCount % 25 === 0) {
      perfLog(`${logName}: ${hitCount}/${requestCount} cache hits`);
    }

    requestCount += 1;

    // Reuse successful and pending queries as described above.
    if (
      currentGet &&
      ((currentGet.state === "running" && currentGet.created > Date.now() - maxPendingAgeMs) ||
        (currentGet.state === "success" && currentGet.created > Date.now() - maxAgeMs))
    ) {
      hitCount += 1;
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
    cache.delete(formattedKey);
    cache.set(formattedKey, newGet);

    // Delete least-recently-used entries.
    if (cache.size > maxSize) {
      const extraKeys = Array.from(cache.keys()).slice(0, cache.size - maxSize);
      for (const extraKey of extraKeys) cache.delete(extraKey);
    }

    return newGet.promise;
  }) as CachedGet<A, R>;

  cachedGet.invalidate = (key) => {
    if (key) cache.delete(formatKey(key));
    else cache.clear();
  };

  return cachedGet;
}
