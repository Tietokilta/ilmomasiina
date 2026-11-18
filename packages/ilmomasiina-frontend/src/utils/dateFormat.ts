import { useCallback, useMemo } from "react";

import { useTranslation } from "react-i18next";

/** Returns a formatter for event dates like "31.12.2024". */
export function useEventDateFormatter() {
  const { t } = useTranslation();
  const locale = t("dateFormat.locale");
  return useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour12: false,
        timeZone: TIMEZONE,
      }),
    [locale],
  );
}

/** Returns a formatter for event datetimes like "su 31.12.2024 23:59". */
export function useEventDateTimeFormatter() {
  const { t } = useTranslation();
  const locale = t("dateFormat.locale");
  return useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: false,
        timeZone: TIMEZONE,
      }),
    [locale],
  );
}

/** Returns a formatter for seconds-accurate datetimes like "31.12.2024 23:59:59". */
export function useActionDateTimeFormatter() {
  const { t } = useTranslation();
  const locale = t("dateFormat.locale");
  return useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
        timeZone: TIMEZONE,
      }),
    [locale],
  );
}

/** Returns a formatter for the milliseconds of a time. */
export function useMillisecondsDateTimeFormatter() {
  const { t } = useTranslation();
  const locale = t("dateFormat.locale");
  return useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        fractionalSecondDigits: 3,
      }),
    [locale],
  );
}

export function useDurationFormatter() {
  const { t } = useTranslation();
  return useCallback(
    (ms: number) => {
      const sec = ms / 1000;
      if (sec < 120) return t("duration.secs", { count: Math.floor(sec) });
      if (sec < 3600 + 60 - 1) return t("duration.mins", { count: Math.floor(sec / 60) });
      if (sec < 86400 + 3600 - 1) return t("duration.hours", { count: Math.floor(sec / 3600) });
      return t("duration.days", { count: Math.floor(sec / 86400) });
    },
    [t],
  );
}

/** Returns a function that formats an event's time span compactly, like "su 31.12.2024, 18.00–23.30".
 *
 * Events within a single day share the date; multi-day events show both dates.
 */
export function useEventRangeFormatter() {
  const { t } = useTranslation();
  const locale = t("dateFormat.locale");
  return useMemo(() => {
    const dateFormat = new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
      month: "numeric",
      year: "numeric",
      timeZone: TIMEZONE,
    });
    const timeFormat = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
      timeZone: TIMEZONE,
    });
    return (start: Date, end: Date | null) => {
      const startDate = dateFormat.format(start);
      if (!end) return `${startDate}, ${timeFormat.format(start)}`;
      const endDate = dateFormat.format(end);
      if (startDate === endDate) {
        return `${startDate}, ${timeFormat.format(start)}–${timeFormat.format(end)}`;
      }
      return `${startDate}, ${timeFormat.format(start)} – ${endDate}, ${timeFormat.format(end)}`;
    };
  }, [locale]);
}
