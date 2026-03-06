import React, { MouseEventHandler } from "react";

import { Button, ButtonProps } from "react-bootstrap";
import { LinkProps, useHref, useLinkClickHandler } from "react-router";

type Props = Omit<ButtonProps, "as" | "href" | "onClick"> & Pick<LinkProps, "to" | "replace">;

export default function LinkButton({ to, replace, ...props }: Props) {
  const onClick = useLinkClickHandler(to, { replace });
  const href = useHref(to);
  return <Button {...props} href={href} onClick={onClick as unknown as MouseEventHandler<HTMLButtonElement>} />;
}
