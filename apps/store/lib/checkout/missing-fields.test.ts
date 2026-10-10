import { describe, expect, it } from 'vitest';

import { missingCheckoutFields, type CheckoutValues } from './missing-fields';

const complete: CheckoutValues = {
  name: 'Dilnoza',
  phone: '+998 90 123 45 67',
  region: 'Ташкент',
  district: 'Юнусабад',
  address: 'ул. Амира Темура, 1',
  deliveryMethod: 'courier-tashkent',
};

describe('missingCheckoutFields', () => {
  it('lets a complete form through', () => {
    expect(missingCheckoutFields(complete)).toEqual([]);
  });

  // The first entry is the field the form focuses, so the list has to follow
  // the page from top to bottom.
  it('lists what an untouched form still needs, in page order', () => {
    expect(
      missingCheckoutFields({
        name: '',
        phone: '',
        region: '',
        district: '',
        address: '',
        deliveryMethod: '',
      }),
    ).toEqual(['name', 'phone', 'region', 'district', 'delivery']);
  });

  // The server trims before it checks, so spaces must not pass here either:
  // the customer would be let through and then refused.
  it('treats a name of spaces as missing', () => {
    expect(missingCheckoutFields({ ...complete, name: '   ' })).toEqual(['name']);
  });

  // The field starts as "+998 ". The server takes any five characters, so
  // "+998 9" would go through and leave staff with a number they cannot call.
  it('asks for the phone until it is a complete number', () => {
    expect(missingCheckoutFields({ ...complete, phone: '+998 ' })).toEqual(['phone']);
    expect(missingCheckoutFields({ ...complete, phone: '+998 9' })).toEqual(['phone']);
    expect(missingCheckoutFields({ ...complete, phone: '+998 90 123 45 6' })).toEqual(['phone']);
    expect(missingCheckoutFields({ ...complete, phone: '901234567' })).toEqual([]);
  });

  // Pickup is collected from the shop: asking for a street would block an order
  // the server accepts.
  it('does not ask for a street when the order is picked up', () => {
    expect(missingCheckoutFields({ ...complete, deliveryMethod: 'pickup', address: '' })).toEqual(
      [],
    );
  });

  it('asks for a street when the order is delivered', () => {
    expect(missingCheckoutFields({ ...complete, address: '  ' })).toEqual(['address']);
    expect(missingCheckoutFields({ ...complete, deliveryMethod: 'regional', address: '' })).toEqual(
      ['address'],
    );
  });

  // Until a method is chosen nobody knows whether a street is needed. Asking
  // for it then would send a pickup customer to fill a field they do not need.
  it('asks for the delivery method before the street', () => {
    expect(missingCheckoutFields({ ...complete, deliveryMethod: '', address: '' })).toEqual([
      'delivery',
    ]);
  });
});
