import React, { ComponentPropsWithoutRef } from "react";

import { enUS } from "date-fns/locale/en-US";
import { fi } from "date-fns/locale/fi";
import DatePicker, { registerLocale } from "react-datepicker";
import { useField } from "react-final-form";
import { useTranslation } from "react-i18next";

import "react-datepicker/dist/react-datepicker.css";

registerLocale("fi", fi);
registerLocale("en", enUS);

type Props = Pick<
  ComponentPropsWithoutRef<typeof DatePicker>,
  "selectsStart" | "selectsEnd" | "startDate" | "endDate" | "id"
> & {
  name: string;
};

export default function DateTimePicker({ name, id, selectsStart, selectsEnd, startDate, endDate }: Props) {
  const {
    input: { value, onChange, onBlur },
  } = useField(name);
  const {
    t,
    i18n: { language },
  } = useTranslation();
  return (
    <DatePicker
      name={name}
      id={id}
      selected={value}
      startDate={selectsStart ? value : startDate}
      endDate={selectsEnd ? value : endDate}
      selectsStart={selectsStart}
      selectsEnd={selectsEnd}
      showTimeSelect
      showWeekNumbers
      className="form-control"
      isClearable
      showPopperArrow={false}
      dateFormat="dd.MM.yyyy HH:mm"
      timeFormat="HH:mm"
      locale={language}
      timeCaption={t("datePicker.time")}
      onBlur={onBlur}
      onChange={onChange}
    />
  );
}
