import { useTranslation } from "react-i18next";
import { lruMemoize } from "reselect";

const formatFactory = lruMemoize(
  (locale: string, currency: string, opts: Partial<Intl.NumberFormatOptions>) => {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      ...opts,
    });
    return (value: number) => formatter.format(value / 100);
  },
  { maxSize: 16 },
);

const defaultOpts: Partial<Intl.NumberFormatOptions> = {
  // minimumFractionDigits: 0 produces abominations like "$39.1", we prefer either two or zero decimals
  trailingZeroDisplay: "stripIfInteger",
};

export function usePriceFormatter(currency = CURRENCY) {
  const { t } = useTranslation();
  const locale = t("currencyFormat.locale");

  return formatFactory(locale, currency, defaultOpts);
}

const decimalOpts: Partial<Intl.NumberFormatOptions> = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export function useDecimalPriceFormatter(currency = CURRENCY) {
  const { t } = useTranslation();
  const locale = t("currencyFormat.locale");

  return formatFactory(locale, currency, decimalOpts);
}
