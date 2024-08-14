import { describe, expect, test, vi } from "vitest";

import createCache from "../../src/util/cache";

describe("createCache", () => {
  test("returns correct results", async () => {
    const get = async (key: number) => key + 1;
    const cache = createCache({ allowTesting: true, maxAgeMs: Infinity, get });
    expect(await cache(1)).toEqual(2);
    expect(await cache(39)).toEqual(40);
  });

  test("does not call get() unnecessarily", () => {
    const get = vi.fn(async (key: number) => key + 1);
    const cache = createCache({ allowTesting: true, maxAgeMs: Infinity, get });

    cache(1);
    cache(2);
    cache(3);
    cache(1);
    cache(1);
    cache(2);
    cache(1);
    expect(get).toBeCalledTimes(3);
  });

  test("respects maxAge", async () => {
    let add = 1;
    const get = vi.fn(async (key: number) => key + add);
    const cache = createCache({ allowTesting: true, maxAgeMs: 1000, get });

    vi.useFakeTimers();

    expect(await cache(1)).toEqual(2);
    expect(await cache(1)).toEqual(2);
    expect(get).toBeCalledTimes(1);

    vi.setSystemTime(Date.now() + 1500);

    add = 2;
    expect(await cache(1)).toEqual(3);
    expect(await cache(1)).toEqual(3);
    expect(get).toBeCalledTimes(2);

    vi.useRealTimers();
  });

  test("respects maxSize", async () => {
    let add = 1;
    const get = vi.fn(async (key: number) => key + add);
    const cache = createCache({ allowTesting: true, maxAgeMs: Infinity, maxSize: 3, get });

    expect(await cache(1)).toEqual(2);
    expect(await cache(2)).toEqual(3);
    expect(await cache(3)).toEqual(4);
    expect(await cache(4)).toEqual(5);
    expect(await cache(3)).toEqual(4);
    expect(await cache(2)).toEqual(3);
    expect(get).toBeCalledTimes(4);

    add = 2;
    expect(await cache(1)).toEqual(3);
    expect(get).toBeCalledTimes(5);
  });

  test("respects invalidate()", async () => {
    let add = 1;
    const get = vi.fn(async (key: number) => key + add);
    const cache = createCache({ allowTesting: true, maxAgeMs: Infinity, get });

    expect(await cache(1)).toEqual(2);
    expect(await cache(1)).toEqual(2);
    expect(get).toBeCalledTimes(1);

    add = 2;
    cache.invalidate();

    expect(await cache(1)).toEqual(3);
    expect(await cache(1)).toEqual(3);
    expect(get).toBeCalledTimes(2);
  });
});
