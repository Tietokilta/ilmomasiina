import Stripe from "stripe";

export const createPrice = async (amount: number, quotaId: string, eventTitle: string, quotaTitle: string): Promise<Stripe.Price> => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY!)

  return stripe.prices.create({
    unit_amount: amount ?? 0,
    currency: "eur",
    product_data: {
      name: `${quotaId}-${eventTitle.replace(" ", "_")  }-${  quotaTitle.replace(" ", "_")  }`,
    },
  });
}

export const getPrice = async (priceId: string): Promise<Stripe.Price> => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY!)
  return stripe.prices.retrieve(priceId);
}

export const updatePrice = async (priceId: string, newAmount: number, quotaId: string, eventTitle: string, quotaTitle: string): Promise<Stripe.Price> => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY!)
  const price = await getPrice(priceId);
  await stripe.products.update(price.product as string, {
    active: false,
  });
  return createPrice(newAmount, quotaId, eventTitle, quotaTitle);
}

export const deletePrice = async (priceId: string): Promise<void> => {
  const stripe = new Stripe(process.env.STRIPE_API_KEY!)
  const price = await getPrice(priceId);
  await stripe.products.update(price.product as string, {
    active: false,
  });
}
