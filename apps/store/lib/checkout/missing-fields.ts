// What still stops a checkout form from being sent. The rules follow the ones
// the server applies in lib/orders/create.ts (the zod schema and the pickup
// check below it); keep the two in step, or the form lets through an order the
// server then refuses. The phone is the one place the form asks for more: the
// server takes any five characters, the form wants a number staff can call.

import { normalizeUzPhone } from '@/lib/phone';

export type CheckoutField = 'name' | 'phone' | 'region' | 'district' | 'address' | 'delivery';

export interface CheckoutValues {
  name: string;
  phone: string;
  region: string;
  district: string;
  address: string;
  deliveryMethod: string;
}

/**
 * The fields the customer still has to fill, in the order they appear on the
 * page: the first one is where the form sends the cursor. `${field}_required`
 * is the matching error code.
 */
export const missingCheckoutFields = (values: CheckoutValues): CheckoutField[] => {
  const missing: CheckoutField[] = [];
  if (values.name.trim().length === 0) missing.push('name');
  if (normalizeUzPhone(values.phone) === null) missing.push('phone');
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
