import { useTranslations } from 'next-intl';

interface Props {
  seasons: Record<'spring' | 'summer' | 'autumn' | 'winter', number>;
  time:    Record<'day' | 'night', number>;
  love:    Record<'love' | 'like' | 'dislike' | 'hate', number>;
  votesCount: number;
}

export const AggregateBars = ({ seasons, time, love, votesCount }: Props) => {
  const t = useTranslations('pdp.aggregates');
  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Group title={t('seasons')} data={seasons} colors={{ spring: '#86efac', summer: '#fde68a', autumn: '#fdba74', winter: '#bae6fd' }} tk={(k) => t(`season.${k}`)} />
      <Group title={t('timeTitle')}    data={time}    colors={{ day: '#fde68a', night: '#312e81' }} tk={(k) => t(`time.${k}`)} />
      <Group title={t('loveTitle')}    data={love}    colors={{ love: '#e11d48', like: '#f43f5e', dislike: '#a8a29e', hate: '#1c1917' }} tk={(k) => t(`love.${k}`)} />
      <p className="md:col-span-3 text-xs text-stone-500">{t('basedOn', { count: votesCount })}</p>
    </section>
  );
};

interface GroupProps<K extends string> {
  title: string;
  data: Record<K, number>;
  colors: Record<K, string>;
  tk: (k: K) => string;
}

const Group = <K extends string>({ title, data, colors, tk }: GroupProps<K>) => {
  const max = Math.max(...Object.values<number>(data), 1);
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-widest text-stone-500">{title}</h3>
      <ul className="space-y-2">
        {(Object.keys(data) as K[]).map((k) => (
          <li key={k} className="flex items-center gap-2">
            <span className="w-20 text-sm text-stone-700">{tk(k)}</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(data[k] / max) * 100}%`, backgroundColor: colors[k] }} aria-hidden />
            </div>
            <span className="w-10 text-right text-xs tabular-nums text-stone-500">{Math.round(data[k] * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
