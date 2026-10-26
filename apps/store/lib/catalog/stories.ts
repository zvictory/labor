// Editorial stories for the product story page (/[locale]/product/[slug]/story).
// The page is built from the catalogue record for any product; a story adds
// the words a record cannot carry: why the perfume exists and how it feels.
// Keyed by catalogue slug. Write in our own words; facts about the perfume
// (notes, perfumer, year) come from the record, not from here.

import type { LocaleText } from '@/lib/catalog/types';

export interface ProductStory {
  /** One line under the name, in the hero. */
  hook: LocaleText;
  /** Two or three short paragraphs. */
  chapters: LocaleText[];
}

export const PRODUCT_STORIES: Record<string, ProductStory> = {
  risvelium: {
    hook: {
      ru: 'Аромат пробуждения: первый свет, цитрус и дерево.',
      uz: 'Uygʻonish hidi: ilk yorugʻlik, sitrus va yogʻoch.',
      en: 'The scent of waking up: first light, citrus and wood.',
    },
    chapters: [
      {
        ru: 'Алессандро Гуальтьери, основатель Orto Parisi, построил Risvelium вокруг одной идеи — пробуждения. Не утро по расписанию, а момент, когда привычное вдруг кажется новым.',
        uz: 'Orto Parisi asoschisi Alessandro Gualtieri Risvelium’ni bitta gʻoya — uygʻonish atrofida qurgan. Jadval boʻyicha tong emas, balki odatiy narsa toʻsatdan yangi tuyuladigan lahza.',
        en: 'Alessandro Gualtieri, who founded Orto Parisi, built Risvelium around one idea: waking up. Not the scheduled morning, but the moment the familiar suddenly feels new.',
      },
      {
        ru: 'Начинается он ярко и прямо, а потом уходит в тёплый, плотный след, который держится близко к коже. Его лучше один раз попробовать на себе, чем десять раз прочитать: возьмите пробник 2 мл.',
        uz: 'U yorqin va toʻgʻridan-toʻgʻri ochiladi, soʻng teriga yaqin turadigan iliq, quyuq izga oʻtadi. Uni oʻn marta oʻqigandan koʻra bir marta oʻzingizda sinab koʻrgan maʼqul: 2 ml namunani oling.',
        en: 'It opens bright and direct, then settles into a warm, dense trail that stays close to the skin. Better tried once than read about ten times: take the 2 ml sample.',
      },
    ],
  },
};

export const getProductStory = (slug: string): ProductStory | null => PRODUCT_STORIES[slug] ?? null;
