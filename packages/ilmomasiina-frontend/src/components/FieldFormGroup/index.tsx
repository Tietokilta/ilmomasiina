import React, { ReactNode } from "react";

import { FormGroup, FormLabel, FormText } from "react-bootstrap";
import { Field, FieldRenderProps } from "react-final-form";

type Props<FieldValue, T extends HTMLElement = HTMLElement, InputValue = FieldValue> = {
  name: string;
  label: ReactNode;
  required?: boolean;
  children: (props: FieldRenderProps<FieldValue, T, InputValue>) => ReactNode;
};

export default function FieldFormGroup<FieldValue = string>({ name, label, required, children }: Props<FieldValue>) {
  return (
    <Field name={name}>
      {({ input, meta }) => (
        <FormGroup className="mb-3" controlId={name}>
          <FormLabel data-required={required}>{label}</FormLabel>
          {children({ input, meta })}
          {meta.touched && meta.error ? <FormText className="text-danger">{meta.error}</FormText> : null}
        </FormGroup>
      )}
    </Field>
  );
}
