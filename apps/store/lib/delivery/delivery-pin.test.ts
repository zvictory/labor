import { describe, expect, it } from 'vitest';
import { orderDeliveryPin, yandexDeliveryPinUrl } from './delivery-pin';

const pin = { lat: 41.29951, lng: 69.24012 };

describe('delivery pin', () => {
  it('keeps customer-confirmed points only for the Tashkent city courier', () => {
    for (const region of ['город Ташкент', 'Toshkent shahri']) {
      expect(orderDeliveryPin(pin, 'courier-tashkent', region)).toEqual(pin);
    }
    expect(orderDeliveryPin(pin, 'pickup', 'Toshkent shahri')).toBeNull();
    expect(orderDeliveryPin(pin, 'regional', 'Toshkent shahri')).toBeNull();
    expect(orderDeliveryPin(pin, 'courier-tashkent', 'Toshkent viloyati')).toBeNull();
  });

  it.each([
    undefined,
    null,
    { lat: 41 },
    { ...pin, lat: 91 },
    { ...pin, lng: Infinity },
    { ...pin, lng: '69.24' },
  ])('allows checkout without storing an invalid or incomplete point (%j)', (value) => {
    expect(orderDeliveryPin(value, 'courier-tashkent', 'Toshkent shahri')).toBeNull();
  });

  it('encodes longitude first and shares only the pin in the map link', () => {
    const url = new URL(yandexDeliveryPinUrl(pin));
    expect(url.origin + url.pathname).toBe('https://yandex.com/maps/');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      pt: '69.240120,41.299510',
      z: '17',
      l: 'map',
    });
  });
});
