import { UseFieldConfig } from "react-final-form";

const priceConfig: UseFieldConfig<number | null> = {
  parse: (value: string) => {
    if (!value) return null;

    // remove euro sign and spaces to parse
    const clean = value.replace(/[€\s]/g, "");

    const num = Number(clean);
    if (Number.isNaN(num)) return null;

    // convert euros to cents integer
    return Math.round(num * 100);
  },

  format: (value: number | null) => {
    if (value == null) return "";

    // value is cents, convert to euro
    return `${(value / 100).toFixed(2)  }€`;
  },
};

export default priceConfig;
