import React, { ComponentType, forwardRef, JSX, useState } from "react";

import { OverlayTrigger, Tooltip, TooltipProps } from "react-bootstrap";
import { useTranslation } from "react-i18next";

import FieldRow, { FieldRowProps } from "../../../components/FieldRow";
import useLocalizedFieldProps, { FieldLocalizationOptions } from "./useLocalizedFieldProps";

const LocalizedTooltip = forwardRef<HTMLDivElement, Omit<TooltipProps, "id">>((props, ref) => {
  const { t } = useTranslation();
  const [id] = useState(`tooltip${Math.random()}`);
  return (
    <Tooltip {...props} ref={ref} id={id}>
      {t("editor.localized")}
    </Tooltip>
  );
});

const localizedIcon = (
  <OverlayTrigger placement="right" overlay={(props) => <LocalizedTooltip {...props} />}>
    {(props) => <span {...props}>🌐</span>}
  </OverlayTrigger>
);

type As = keyof JSX.IntrinsicElements | ComponentType<any>;

type Props<C extends As> = FieldRowProps<C> & FieldLocalizationOptions;

/** FieldRow that renders the field for the currently chosen language version. */
export default function LocalizedFieldRow<C extends As>({
  name: baseName,
  required: baseRequired,
  label,
  defaultAsPlaceholder,
  ...props
}: Props<C>) {
  const localizedProps = useLocalizedFieldProps({ name: baseName, required: baseRequired, defaultAsPlaceholder });

  return (
    <FieldRow
      label={
        <>
          {localizedIcon} {label}
        </>
      }
      {...localizedProps}
      {...props}
    />
  );
}
