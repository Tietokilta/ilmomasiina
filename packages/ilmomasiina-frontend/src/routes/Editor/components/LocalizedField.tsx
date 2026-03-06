import React, { ComponentPropsWithoutRef, ComponentType, JSX } from "react";

import identity from "lodash-es/identity";
import { Form, FormControlProps } from "react-bootstrap";
import { useField, UseFieldConfig } from "react-final-form";

import useLocalizedFieldProps, { FieldLocalizationOptions } from "./useLocalizedFieldProps";

type BaseProps = Pick<UseFieldConfig<any>, "type"> & {
  /** The name of the field in the data. */
  name: string;
  /** useField() config. */
  config?: UseFieldConfig<any>;
  /** Whether the field is required. */
  required?: boolean;
} & FieldLocalizationOptions;

// These typings do the best attempt we can do with merged props.
// Ideally, with TypeScript, we should provide a render function, but I'll defer that change
// to when we get rid of react-bootstrap altogether.

// react-bootstrap's typing for Form.Control is extremely broad, so only allow <input> props.
type InputProps = ComponentPropsWithoutRef<"input">;

// Props with neither `children` nor `as`, assume `Form.Control`.
type PropsWithFormControl = BaseProps & {
  as?: undefined;
} & Omit<FormControlProps & InputProps, keyof BaseProps | "as">;

type As = keyof JSX.IntrinsicElements | ComponentType<any>;

// Props with a custom `as` component.
type PropsWithAs<C extends As> = BaseProps & {
  /** The component or element to use as the field. */
  as: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof BaseProps | "as">;

export type FieldRowProps<C extends As> = PropsWithFormControl | PropsWithAs<C>;

/** react-final-form field wrapper that renders the field for the currently chosen language version. */
export default function LocalizedField<C extends As>({
  name: baseName,
  as,
  type,
  required: baseRequired,
  config,
  defaultAsPlaceholder,
  ...props
}: FieldRowProps<C>) {
  const { name, required, ...placeholder } = useLocalizedFieldProps({
    name: baseName,
    required: baseRequired,
    defaultAsPlaceholder,
  });

  const {
    input,
    meta: { invalid },
  } = useField(name, {
    type,
    // react-final-form replaces empty strings by undefined for whatever reason.
    // Override the default (but allow config to override this).
    parse: identity,
    ...config,
  });
  const Component = (as ?? Form.Control) as ComponentType<any>;
  return <Component isInvalid={invalid} required={required} {...placeholder} {...props} {...input} />;
}
