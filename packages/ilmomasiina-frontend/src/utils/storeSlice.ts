import { StateCreator } from "zustand";

type Set<R> = Parameters<StateCreator<R>>[0];
type Get<R> = Parameters<StateCreator<R>>[1];
type Store<R> = Parameters<StateCreator<R>>[2];

type SliceCreator<Root extends object, Slice> = (
  set: Set<Root>,
  get: Get<Root>,
  store: Store<Root>,
  getSlice: () => Slice,
  setSlice: (slice: Partial<Slice> | ((prev: Slice) => Partial<Slice>)) => void,
  resetState: () => void,
) => Slice;

/** Wraps a StateCreator to provide `getSlice` and `setSlice` functions that work similarly to Redux. */
const storeSlice =
  <Root extends object>() =>
  <Name extends keyof Root>(
    name: Name,
    creator: SliceCreator<Root, Root[Name]>,
  ): StateCreator<Root, [], [], Root[Name]> =>
  (set, get, store) => {
    const getSlice = () => get()[name];

    const setSlice = (slice: Partial<Root[Name]> | ((prev: Root[Name]) => Partial<Root[Name]>)) => {
      set((state: Root): Partial<Root> => {
        const update = typeof slice === "function" ? slice(state[name]) : slice;
        const next: Partial<Root> = {};
        next[name] = { ...state[name], ...update };
        return next;
      });
    };

    const resetState = () =>
      set(() => {
        const next: Partial<Root> = {};
        next[name] = store.getInitialState()[name];
        return next;
      });

    return creator(set, get, store, getSlice, setSlice, resetState);
  };

export default storeSlice;
