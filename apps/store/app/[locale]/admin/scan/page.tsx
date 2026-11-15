// The branch till: record a member's purchase or open a card for a new one.
// Staff and admin. Built for the shop's phone or tablet.

import { requireStaff } from '@/lib/admin/guard';
import { resolveLocaleText } from '@/lib/catalog/locale';
import { STORE_CONTACT } from '@/lib/store-contact';
import { Counter } from '@/components/admin/loyalty/counter';

export default async function AdminScanPage() {
  await requireStaff();
  const branches = STORE_CONTACT.branches.map((b) => ({
    id: b.id,
    name: resolveLocaleText(b.name, 'ru'),
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-ink dark:text-bone text-3xl">Касса</h1>
        <p className="text-ink-muted mt-1 text-sm dark:text-stone-400">
          Бонусы Labor: найдите клиента по QR-коду, номеру карты или телефону.
        </p>
      </header>
      <Counter branches={branches} />
    </div>
  );
}
