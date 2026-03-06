import { useField } from "react-final-form";

/** Like `useFieldArray`, but returns only the `map` and `length` properties for efficiency.
 *
 * (We often don't need all the stuff added by useFieldArray, and using it would also
 * duplicate the mutators from `useLocalizedFieldArrayMutators`.
 */
export default function useFieldArrayMap(name: string) {
  const length = useField(name, { subscription: { length: true } }).meta.length!;

  return {
    length,
    // Copied from https://github.com/final-form/react-final-form-arrays/blob/v3.1.4/src/useFieldArray.js#L80
    // Not intended to be used as a dep, so no useCallback.
    map: <R>(func: (name: string, index: number) => R) => {
      const result = [];
      for (let i = 0; i < length; i++) result.push(func(`${name}[${i}]`, i));
      return result;
    },
  };
}
