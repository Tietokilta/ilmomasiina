import React from "react";

import type { Options } from "csv-stringify/browser/esm/sync";
import { Button, ButtonProps } from "react-bootstrap";

export type { Options as CSVOptions };

async function downloadCsv(data: string[][], options: Options | undefined, filename: string) {
  const { stringify } = await import("csv-stringify/browser/esm/sync");
  const url = URL.createObjectURL(new Blob([stringify(data, options)], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url));
}

type Props = Omit<ButtonProps, "href" | "onClick"> & {
  data: string[][];
  csvOptions?: Options;
  download: string;
};

const CSVLink = ({ data, csvOptions, download, ...props }: Props) => (
  <Button variant="primary" onClick={() => void downloadCsv(data, csvOptions, download)} {...props} />
);

export default CSVLink;
