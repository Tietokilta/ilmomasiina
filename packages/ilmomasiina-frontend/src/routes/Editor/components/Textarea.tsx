import React, { TextareaHTMLAttributes } from "react";

import { Form, FormControlProps } from "react-bootstrap";

const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <Form.Control as="textarea" {...(props as FormControlProps)} />
);

export default Textarea;
