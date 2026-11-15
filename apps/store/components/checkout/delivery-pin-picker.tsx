'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { deliveryPinSchema, type DeliveryPin } from '@/lib/delivery/delivery-pin';

import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

const osmAttribution =
  '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>';

function MapCanvas({
  tileUrl,
  tileCredit,
  initial,
  center,
  onPick,
}: {
  tileUrl: string;
  tileCredit: string;
  initial: DeliveryPin | null;
  center: DeliveryPin;
  onPick: (pin: DeliveryPin) => void;
}) {
  const t = useTranslations('deliveryPin');
  const container = useRef<HTMLDivElement>(null);
  const selectCenter = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const initialLat = initial?.lat;
  const initialLng = initial?.lng;
  const { lng, lat } = center;

  useEffect(() => {
    let active = true;
    let map: LeafletMap | undefined;
    const node = container.current;
    if (!node) return;

    let tilesReady = false;
    const deadline = window.setTimeout(() => {
      if (active && !tilesReady) setStatus('failed');
    }, 12000);

    void import('leaflet')
      .then((L) => {
        if (!active) return;
        const current = L.map(node, { scrollWheelZoom: false }).setView(
          [initialLat ?? lat, initialLng ?? lng],
          initialLat === undefined ? 12 : 16,
        );
        map = current;
        const credit = document.createElement('span');
        credit.textContent = tileCredit;
        const layer = L.tileLayer(tileUrl, {
          attribution: tileCredit ? `${osmAttribution} · ${credit.innerHTML}` : osmAttribution,
          maxZoom: 19,
          referrerPolicy: 'strict-origin-when-cross-origin',
        });
        layer.on('tileload', () => {
          tilesReady = true;
          window.clearTimeout(deadline);
          if (active) setStatus('ready');
        });
        layer.addTo(current);

        const icon = L.divIcon({
          className: 'rounded-full border-2 border-white bg-[#22211f] shadow-sm',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        let marker: Marker | undefined;
        const showMarker = (point: DeliveryPin) => {
          const position: [number, number] = [point.lat, point.lng];
          if (marker) marker.setLatLng(position);
          else
            marker = L.marker(position, { icon, interactive: false, keyboard: false }).addTo(
              current,
            );
        };
        const pick = (point: DeliveryPin) => {
          if (!active || !tilesReady) return;
          const pin = deliveryPinSchema.safeParse({ lat: point.lat, lng: point.lng });
          if (!pin.success) return;
          showMarker(pin.data);
          onPick(pin.data);
        };

        if (initialLat !== undefined && initialLng !== undefined) {
          showMarker({ lat: initialLat, lng: initialLng });
        }
        current.on('click', ({ latlng }) => pick(latlng));
        selectCenter.current = () => pick(current.getCenter());
      })
      .catch(() => {
        window.clearTimeout(deadline);
        if (active) {
          map?.remove();
          map = undefined;
          setStatus('failed');
        }
      });

    return () => {
      active = false;
      window.clearTimeout(deadline);
      selectCenter.current = null;
      map?.remove();
    };
  }, [tileUrl, tileCredit, initialLat, initialLng, lat, lng, onPick]);

  return (
    <>
      <div
        ref={container}
        className="isolate h-64 w-full border sm:h-80"
        role="region"
        aria-label={t('mapLabel')}
      />
      {status === 'loading' ? (
        <p role="status" className="text-sm">
          {t('loading')}
        </p>
      ) : null}
      {status === 'failed' ? (
        <p role="status" className="text-sm">
          {t('unavailable')}
        </p>
      ) : null}
      {status === 'ready' ? (
        <button
          type="button"
          className="min-h-11 text-sm underline underline-offset-4"
          onClick={() => selectCenter.current?.()}
        >
          {t('useCenter')}
        </button>
      ) : null}
    </>
  );
}

export function DeliveryPinPicker({
  tileUrl,
  tileCredit,
  center,
  value,
  onChange,
}: {
  tileUrl: string;
  tileCredit: string;
  center: DeliveryPin;
  value: DeliveryPin | null;
  onChange: (pin: DeliveryPin | null) => void;
}) {
  const t = useTranslations('deliveryPin');
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState<DeliveryPin | null>(null);

  return (
    <div className="border-border space-y-3 border p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          className="border-border hover:border-foreground min-h-11 border px-3 text-sm font-medium"
          onClick={() => {
            setCandidate(null);
            setOpen(!open);
          }}
        >
          {open ? t('close') : value ? t('edit') : t('open')}
        </button>
        {value ? (
          <button
            type="button"
            className="min-h-11 text-sm underline underline-offset-4"
            onClick={() => {
              onChange(null);
              setCandidate(null);
              setOpen(false);
            }}
          >
            {t('remove')}
          </button>
        ) : null}
      </div>
      {value ? (
        <p role="status" className="text-sm">
          {t('saved')}
        </p>
      ) : null}
      <div id={panelId} hidden={!open} className="space-y-3">
        {open ? (
          <>
            <p className="text-muted-foreground text-sm">{t('instruction')}</p>
            <MapCanvas
              tileUrl={tileUrl}
              tileCredit={tileCredit}
              initial={value}
              center={center}
              onPick={setCandidate}
            />
            <button
              type="button"
              disabled={!candidate}
              className="bg-foreground text-background min-h-11 px-3 text-sm font-medium disabled:opacity-40"
              onClick={() => {
                if (!candidate) return;
                onChange(candidate);
                setOpen(false);
              }}
            >
              {t('confirm')}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
