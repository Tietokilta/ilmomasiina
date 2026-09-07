import { useDocumentTitle } from "usehooks-ts";

import branding from "../branding";

export default function useBrandedDocumentTitle(title: string | undefined) {
  useDocumentTitle(title ? `${title} - ${branding.headerTitleShort}` : branding.headerTitleShort);
}
