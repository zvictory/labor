// Free Tashkent courier delivery above an items total — the "free delivery in
// Tashkent" promise Uzbek shops lead with. Off until the shop sets
// FREE_DELIVERY_TASHKENT_FROM (so'm). The total it is compared with is the
// items after any promo discount, so a code cannot both cut the price and
// unlock free delivery on an order that would not otherwise qualify.

const FREE_METHODS: ReadonlySet<string> = new Set(['courier-tashkent']);

/** The configured threshold in so'm, or null when free delivery is off. */
export const freeDeliveryThreshold = (
  raw: string | undefined = process.env.FREE_DELIVERY_TASHKENT_FROM,
): number | null => {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n > 0 ? n : null;
};

/** Whether the method can become free at all. */
export const qualifiesForFreeDelivery = (methodId: string): boolean => FREE_METHODS.has(methodId);

/** The fee to charge for `method` on an order whose items come to `itemsTotal`. */
export const deliveryFee = (
  method: { id: string; baseFee: number },
  itemsTotal: number,
  threshold: number | null,
): number =>
  threshold !== null && qualifiesForFreeDelivery(method.id) && itemsTotal >= threshold
    ? 0
    : method.baseFee;
