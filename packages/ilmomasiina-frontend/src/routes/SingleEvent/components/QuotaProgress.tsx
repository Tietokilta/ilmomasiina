import React from "react";

import { ProgressBar } from "react-bootstrap";
import { useTranslation } from "react-i18next";

type Props = {
  max: number;
  title: string;
  value: number;
};

const QuotaProgress = ({ max, title, value }: Props) => {
  const { t } = useTranslation();
  return (
    <div>
      {title}
      <ProgressBar
        now={Math.min(value, max)}
        max={max}
        className="ilmo--signup-progress"
        label={
          <>
            {value}
            &ensp;/&ensp;
            {max !== Infinity ? max : <span title={t("singleEvent.quotaCounts.unlimited")}>&infin;</span>}
          </>
        }
      />
    </div>
  );
};

export default QuotaProgress;
