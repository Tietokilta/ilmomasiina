import { useDebugValue } from "react";

import { useField } from "react-final-form";

export function useFieldValue<T>(name: string) {
  const { value } = useField<T>(name, { subscription: { value: true } }).input;
  useDebugValue(value);
  return value;
}

export function useFieldTouched(name: string) {
  const { touched } = useField(name, { subscription: { touched: true } }).meta;
  useDebugValue(touched);
  return touched;
}
