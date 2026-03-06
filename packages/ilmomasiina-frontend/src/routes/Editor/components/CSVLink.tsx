import React, { HTMLProps, useEffect, useMemo } from "react";

import { Options, stringify } from "csv-stringify/browser/esm/sync";
import { Button, ButtonProps } from "react-bootstrap";

export type { Options as CSVOptions };

function makeCsvUrl(data: string[][], options?: Options) {
  const csv = stringify(data, options);
  const blob = new Blob([csv], { type: "text/csv" });
  return URL.createObjectURL(blob);
}

type Props = Omit<ButtonProps, "href"> &
  // This is a bit dirty, since TypeScript doesn't realize we're "illegally" passing `download` to Button,
  // but it's spread onto the underlying <a> element.
  Pick<HTMLProps<HTMLAnchorElement>, "download"> & {
    data: string[][];
    csvOptions?: Options;
  };

const CSVLink = ({ data, csvOptions, ...props }: Props) => {
  const url = useMemo(() => makeCsvUrl(data, csvOptions), [data, csvOptions]);

  // Revoke created URLs when they become unused
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  return <Button variant="primary" href={url} {...props} />;
};

export default CSVLink;
