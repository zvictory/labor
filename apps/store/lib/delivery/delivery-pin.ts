import { z } from 'zod';
import { isTashkentCity } from './uz-regions';

export const deliveryPinSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

export type DeliveryPin = z.infer<typeof deliveryPinSchema>;

export const supportsDeliveryPin = (method: string, region: string): boolean =>
  method === 'courier-tashkent' && isTashkentCity(region);

export function orderDeliveryPin(pin: unknown, method: string, region: string): DeliveryPin | null {
  if (!supportsDeliveryPin(method, region)) return null;
  const parsed = deliveryPinSchema.safeParse(pin);
  return parsed.success ? parsed.data : null;
}

export function yandexDeliveryPinUrl(pin: DeliveryPin): string {
  const url = new URL('https://yandex.com/maps/');
  url.searchParams.set('pt', `${pin.lng.toFixed(6)},${pin.lat.toFixed(6)}`);
  url.searchParams.set('z', '17');
  url.searchParams.set('l', 'map');
  return url.toString();
}
