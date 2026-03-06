import React, { ComponentPropsWithoutRef, ComponentType, JSX, ReactNode } from "react";

import identity from "lodash-es/identity";
import { Col, Form, FormControlProps, Row } from "react-bootstrap";
import { useField, UseFieldConfig } from "react-final-form";
import { ZodIssue } from "zod";

/** Basic unlocalized default formatter for Zod issues. */
const defaultFormatError = (error: unknown) =>
  typeof error === "object" && error && "message" in error
    ? String((error as ZodIssue).message)
    : // Errors without a message field are for a nested field and will be shown there.
      null;

type BaseProps = Pick<UseFieldConfig<any>, "type"> & {
  /** The name of the field in the data. */
  name: string;
  /** Passed as `controlId` if no `controlId` is separately set. */
  id?: string;
  /** Passed to the `FormGroup`. */
  controlId?: string;
  /** The label placed in the left column. */
  label?: ReactNode;
  /** The help string placed below the field. */
  help?: ReactNode;
  /** Whether the field is required. */
  required?: boolean;
  /** Extra feedback rendered below the field. Bring your own `Form.Control.Feedback`. */
  extraFeedback?: ReactNode;
  /** `true` to adjust the vertical alignment of the left column label for checkboxes/radios. */
  checkAlign?: boolean;
  /** Formats a field error. */
  formatError?: (error: any) => ReactNode;
  /** Passed as `label` to the field component. Intended for checkboxes. */
  checkLabel?: ReactNode;
  /** useField() config. */
  config?: UseFieldConfig<any>;
};

// These typings do the best attempt we can do with merged props.
// Ideally, with TypeScript, we should provide a render function, but I'll defer that change
// to when we get rid of react-bootstrap altogether.

// react-bootstrap's typing for Form.Control is extremely broad, so only allow <input> props.
type InputProps = ComponentPropsWithoutRef<"input">;

// Props with neither `children` nor `as`, assume `Form.Control`.
type PropsWithFormControl = BaseProps & {
  children?: undefined;
  as?: undefined;
} & Omit<FormControlProps & InputProps, keyof BaseProps | "as" | "children">;

// Props with `children` given, no extra props to pass through.
type PropsWithChildren = BaseProps & {
  /** If given, this is used as the field. */
  children: ReactNode;
  as?: undefined;
};

type As = keyof JSX.IntrinsicElements | ComponentType<any>;

// Props with a custom `as` component.
type PropsWithAs<C extends As> = BaseProps & {
  /** The component or element to use as the field. */
  as: C;
  children?: undefined;
} & Omit<
    ComponentPropsWithoutRef<C>,
    // Drop anything that 1) overlaps with BaseProps, 2) overlaps with other modes, or 3) is handled by r-f-f.
    keyof BaseProps | "as" | "children" | "onChange" | "onFocus" | "onBlur" | "value"
  >;

export type FieldRowProps<C extends As> = PropsWithFormControl | PropsWithChildren | PropsWithAs<C>;

/** react-final-form field row component */
export default function FieldRow<C extends As>({
  name,
  label = "",
  help,
  required = false,
  formatError = defaultFormatError,
  extraFeedback,
  checkAlign,
  checkLabel,
  as,
  children,
  type,
  id,
  controlId = id ?? name,
  config,
  ...props
}: FieldRowProps<C>) {
  const {
    input,
    meta: { error: validationError, submitError, invalid },
  } = useField(name, {
    type,
    // react-final-form replaces empty strings by undefined for whatever reason.
    // Override the default (but allow config to override this).
    parse: identity,
    ...config,
  });
  const error = submitError || validationError;
  const formattedError = invalid && formatError(error);

  let field: ReactNode;
  if (children) {
    field = children;
  } else {
    // Checkboxes have two labels: in the left column and next to the checkbox. Form.Check handles the latter for us
    // and calls it "label", but we still want to call the other one "label" for all other types of field. Therefore
    // we pass "checkLabel" to the field here.
    const overrideProps = checkLabel !== undefined ? { label: checkLabel } : {};
    const Component = (as ?? Form.Control) as ComponentType<any>;
    field = <Component required={required} isInvalid={invalid} {...props} id={id} {...input} {...overrideProps} />;
  }

  return (
    <Form.Group as={Row} className="form-row" controlId={controlId}>
      <Col sm="3" className="ilmo--label-column">
        <Form.Label data-required={required} className={`col-form-label ${checkAlign ? "pt-sm-0" : ""}`}>
          {label}
        </Form.Label>
      </Col>
      <Col sm="9">
        {field}
        {formattedError && (
          // Use text-danger instead of invalid-feedback here. invalid-feedback is hidden automatically when the
          // previous element isn't .is-invalid, but that doesn't work with checkbox arrays.
          <Form.Text className="text-danger">{formattedError}</Form.Text>
        )}
        {extraFeedback}
        {help && <Form.Text muted>{help}</Form.Text>}
      </Col>
    </Form.Group>
  );
}
