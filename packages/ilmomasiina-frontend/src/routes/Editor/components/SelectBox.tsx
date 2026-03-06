import React from "react";

import { Form, FormSelectProps } from "react-bootstrap";

type SelectOptions = [string, string][];

type Props = FormSelectProps & {
  options: SelectOptions;
};

const SelectBox = ({ options, ...props }: Props) => (
  <Form.Select {...props}>
    {options.map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </Form.Select>
);

export default SelectBox;
