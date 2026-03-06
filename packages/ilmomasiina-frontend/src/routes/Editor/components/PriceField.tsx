import React, { ChangeEvent, useEffect, useState } from "react";

import { Form } from "react-bootstrap";
import type { FieldInputProps, UseFieldConfig } from "react-final-form";

import { useDecimalPriceFormatter } from "../../../utils/priceFormat";
import useEvent from "../../../utils/useEvent";

function parseValue(raw: string): number | null {
  // Normalize to a number.
  if (!raw) return 0;
  const clean = raw
    .replace("\u2212", "-") // minus sign to hyphen
    .replace(",", ".") // decimal comma to point
    .replace(/[^0-9.-]/g, ""); // strip non-numeric characters
  // If all characters were non-numeric, the input was invalid.
  if (!clean) return null;
  // If the input seems like a transient value, parse it as zero.
  if (clean === "-" || clean === "." || clean === "-.") return 0;
  // Parse.
  const num = Number(clean);
  // If parsing failed or the number was out of range, return null.
  if (!Number.isFinite(num)) return null;
  // Convert euros to cents integer.
  return Math.round(num * 100);
}

export const priceFieldConfig: UseFieldConfig<number | null> = {
  allowNull: true,
};

/** The field config for price fields using the given currency and current locale. */
export default function PriceField({ value, onChange, onBlur, ...props }: FieldInputProps<number | null>) {
  const formatValue = useDecimalPriceFormatter();

  const [localValue, setLocalValue] = useState(
    // Format invalid and zero values to empty
    () => (value !== 0 && value != null && Number.isFinite(value) ? formatValue(value) : ""),
  );
  const isEditingRef = React.useRef(false);

  // Update local value when external value changes, but not if we're currently editing.
  useEffect(() => {
    if (!isEditingRef.current) {
      setLocalValue(value !== 0 && value != null && Number.isFinite(value) ? formatValue(value) : "");
    }
  }, [value, formatValue]);

  const handleChange = useEvent((event: ChangeEvent<HTMLInputElement>) => {
    isEditingRef.current = true;
    setLocalValue(event.target.value);
    // Attempt to parse, set to null if invalid (to cause a validation error).
    onChange(parseValue(event.target.value || "0"));
  });

  const handleBlur = useEvent(() => {
    isEditingRef.current = false;
    // Reformat valid values, leave empty and invalid as is.
    if (localValue && value != null && Number.isFinite(value)) {
      const formatted = formatValue(value);
      setLocalValue(formatted);
    }
    onBlur();
  });

  return (
    <Form.Control
      type="text"
      inputMode="decimal"
      placeholder={formatValue(0)}
      {...props}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
