import { useCallback } from "react";

import { useForm } from "react-final-form";

import { EditorEvent } from "../../../modules/editor/types";

/** Wraps `final-form-arrays` mutators to update all languages simultaneously. */
export default function useLocalizedFieldArrayMutators<Val = any, Loc = Val>(baseName: string) {
  const form = useForm<EditorEvent>();

  return {
    // Only wrap the mutators we actually use.
    // Also, keep these out of the fields objects, as they modify both.
    push: useCallback(
      (baseValue: Val, localizedValue: Loc) => {
        form.mutators.push(baseName, baseValue);
        const languages = form.getFieldState("languages")!.value!;
        for (const langKey of Object.keys(languages)) {
          form.mutators.push(`languages.${langKey}.${baseName}`, localizedValue);
        }
      },
      [form, baseName],
    ),
    move: useCallback(
      (from: number, to: number) => {
        form.mutators.move(baseName, from, to);
        const languages = form.getFieldState("languages")!.value!;
        for (const langKey of Object.keys(languages)) {
          form.mutators.move(`languages.${langKey}.${baseName}`, from, to);
        }
      },
      [form, baseName],
    ),
    remove: useCallback(
      (index: number) => {
        form.mutators.remove(baseName, index);
        const languages = form.getFieldState("languages")!.value!;
        for (const langKey of Object.keys(languages)) {
          form.mutators.remove(`languages.${langKey}.${baseName}`, index);
        }
      },
      [form, baseName],
    ),
  };
}
