import { useLayoutEffect, useRef } from "react";

// Copied from https://usehooks-ts.com/react-hook/use-document-title

type UseDocumentTitleOptions = {
  preserveTitleOnUnmount?: boolean;
};

export default function useDocumentTitle(title: string, options: UseDocumentTitleOptions = {}): void {
  const { preserveTitleOnUnmount = true } = options;
  const defaultTitle = useRef<string | null>(null);

  useLayoutEffect(() => {
    defaultTitle.current = window.document.title;
  }, []);

  useLayoutEffect(() => {
    window.document.title = title;
  }, [title]);

  useLayoutEffect(
    () => () => {
      if (!preserveTitleOnUnmount && defaultTitle.current) {
        window.document.title = defaultTitle.current;
      }
    },
    [preserveTitleOnUnmount],
  );
}
