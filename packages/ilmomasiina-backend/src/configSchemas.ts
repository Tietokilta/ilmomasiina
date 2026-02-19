import Stripe from "stripe";
import z, { ZodType } from "zod";

/** Validation schema for frontend URL configurations.
 *
 * The "default" frontend is always available, whether configured or not. Configurations using FRONTENDS should typically override it.
 *
 * If a URL is missing for a frontend, the template in the "default" frontend will be used.
 *
 * If a URL is missing for the "default" frontend, the default template based on BASE_URL will be used.
 */
export const frontendsSchema = z.record(
  z.string().min(1),
  z.strictObject({
    /** URL template for an event details page. Used for iCalendar exports. Contains `{slug}`, may contain `{lang}`.
     *
     * This is intended for custom frontends; the default is for the frontend included in the repo.
     *
     * @example "http://example.com/events/{slug}"
     */
    eventDetailsUrl: z
      .url({ protocol: /^https?/ })
      .refine((url) => url.includes("{slug}"), { error: "eventDetailsUrl must include {slug}" })
      .nullish(),

    /** URL template for a signup edit page. Used for emails. Contains `{id}` and `{editToken}`, may contain `{lang}`.
     *
     * This is intended for custom frontends; the default is for the frontend included in the repo.
     *
     * @example "http://example.com/signup/{id}/{editToken}"
     */
    editSignupUrl: z
      .url({ protocol: /^https?/ })
      .refine((url) => url.includes("{id}"), { error: "editSignupUrl must include {id}" })
      .refine((url) => url.includes("{editToken}"), { error: "editSignupUrl must include {editToken}" })
      .nullish(),

    /** URL template for a signup payment completion page. Used for payments. Contains `{id}` and `{editToken}`, may contain `{lang}`.
     *
     * This is intended for custom frontends; the default is for the frontend included in the repo.
     *
     * @example "http://example.com/payment/{id}/{editToken}"
     */
    completePaymentUrl: z
      .url({ protocol: /^https?/ })
      .refine((url) => url.includes("{id}"), { error: "completePaymentUrl must include {id}" })
      .refine((url) => url.includes("{editToken}"), { error: "completePaymentUrl must include {editToken}" })
      .nullish(),

    /** URL template for the admin main page. Used for emails. May contain `{lang}`.
     *
     * This is intended for custom frontends; the default is for the frontend included in the repo.
     *
     * @example "http://example.com/{lang}/admin"
     */
    adminUrl: z.url({ protocol: /^https?/ }).nullish(),
  }),
);

export type FrontendConfig = z.infer<typeof frontendsSchema>[string];
export type FrontendsConfig = z.infer<typeof frontendsSchema> & {
  default: {
    eventDetailsUrl: string;
    editSignupUrl: string;
    completePaymentUrl: string;
    adminUrl: string;
  };
};

/** Validation schema for Stripe branding settings.
 *
 * It's a bit extreme to validate this with Zod, but it ensures payments shouldn't fail due to
 * invalid config.
 */
// eslint-disable-next-line import/prefer-default-export
export const stripeBrandingSchema: ZodType<Stripe.Checkout.SessionCreateParams.BrandingSettings> = z.strictObject({
  background_color: z.string().optional(),
  border_style: z.enum(["pill", "rectangular", "rounded"]).optional(),
  button_color: z.string().optional(),
  display_name: z.string().optional(),
  font_family: z
    .enum([
      "default",
      "be_vietnam_pro",
      "bitter",
      "chakra_petch",
      "hahmlet",
      "inconsolata",
      "inter",
      "lato",
      "lora",
      "m_plus_1_code",
      "montserrat",
      "noto_sans",
      "noto_sans_jp",
      "noto_serif",
      "nunito",
      "open_sans",
      "pridi",
      "pt_sans",
      "pt_serif",
      "raleway",
      "roboto",
      "roboto_slab",
      "source_sans_pro",
      "titillium_web",
      "ubuntu_mono",
      "zen_maru_gothic",
    ])
    .optional(),
  icon: z
    .union([
      z.strictObject({ type: z.literal("file"), file: z.string() }),
      z.strictObject({ type: z.literal("url"), url: z.string() }),
    ])
    .optional(),
  logo: z
    .union([
      z.strictObject({ type: z.literal("file"), file: z.string() }),
      z.strictObject({ type: z.literal("url"), url: z.string() }),
    ])
    .optional(),
});
