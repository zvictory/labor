// What still stops a checkout form from being sent. The rules are the ones the
// server applies in lib/orders/create.ts (the zod schema and the pickup check
// below it); keep the two in step, or the form lets through an order the server
// then refuses.

export type CheckoutField = 'name' | 'phone' | 'region' | 'district' | 'address' | 'delivery';

export interface CheckoutValues {
  name: string;
  phone: string;
  region: string;
  district: string;
  address: string;
  deliveryMethod: string;
}

const PHONE_MIN_LENGTH = 5;

/**
 * The fields the customer still has to fill, in the order they appear on the
 * page: the first one is where the form sends the cursor. `${field}_required`
 * is the matching error code.
 */
export const missingCheckoutFields = (values: CheckoutValues): CheckoutField[] => {
  const missing: CheckoutField[] = [];
  if (values.name.trim().length === 0) missing.push('name');
  if (values.phone.trim().length < PHONE_MIN_LENGTH) missing.push('phone');
  if (values.region.trim().length === 0) missing.push('region');
  if (values.district.trim().length === 0) missing.push('district');

  // A street is needed for every method except pickup, so it can only be asked
  // for once a method is chosen.
  const method = values.deliveryMethod.trim();
  if (method.length === 0) {
    missing.push('delivery');
  } else if (method !== 'pickup' && values.address.trim().length === 0) {
    missing.push('address');
  }
  return missing;
};
