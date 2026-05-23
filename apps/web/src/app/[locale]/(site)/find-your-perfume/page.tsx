import { setRequestLocale } from 'next-intl/server';
import { listProducts, type ProductCard } from '@/lib/api/products';
import {
  PerfumeFinderClient,
  type FinderCandidate,
  type FinderCopy,
} from '@/components/finder/perfume-finder-client';

interface Props {
  params: Promise<{ locale: string }>;
}

type Lang = 'en' | 'ru' | 'uz' | 'uzc';

const SUPPORTED_LANGS: readonly Lang[] = ['en', 'ru', 'uz', 'uzc'] as const;

const toLang = (locale: string): Lang =>
  (SUPPORTED_LANGS as readonly string[]).includes(locale) ? (locale as Lang) : 'en';

const FAMILY_FILTERS = ['woody', 'floral', 'citrus', 'gourmand', 'smoky', 'aquatic', 'leather', 'oriental'];
const GENDER_FILTERS = ['men', 'women', 'unisex'];

const COPY: Record<Lang, FinderCopy> = {
  en: {
    eyebrow: 'Fragrance finder',
    title: 'Find the perfume that matches your style',
    intro:
      'Answer four focused questions and Labor will narrow the catalog to fragrances that fit your mood, presence, and daily rhythm.',
    start: 'Start the finder',
    progress: 'Question {current} of {total}',
    back: 'Back',
    restart: 'Restart',
    resultsEyebrow: 'Your selection',
    resultsTitle: 'Three perfumes to try first',
    resultsIntro: 'These matches are scored from real Labor catalog data and your answers.',
    match: 'Match',
    view: 'View perfume',
    add: 'Add to cart',
    added: 'Added',
    emptyTitle: 'The finder needs catalog data',
    emptyBody: 'We could not load enough products right now. Try again after the catalog API is available.',
    steps: [
      {
        key: 'style',
        eyebrow: 'Style',
        title: 'Who is this scent for?',
        helper: 'Choose the direction that feels closest. Unisex keeps the recommendation broad.',
        choices: [
          { id: 'unisex', label: 'Open', text: 'A flexible signature for any wardrobe', gender: 'unisex' },
          { id: 'men', label: 'Masculine', text: 'Clean, woody, confident, structured', gender: 'men' },
          { id: 'women', label: 'Feminine', text: 'Soft, radiant, floral, polished', gender: 'women' },
          { id: 'neutral', label: 'No rule', text: 'Ignore gender and follow the notes' },
        ],
      },
      {
        key: 'family',
        eyebrow: 'Family',
        title: 'Which world attracts you first?',
        helper: 'This is the strongest signal in the match.',
        choices: [
          { id: 'woods', label: 'Woods', text: 'Sandalwood, cedar, smoke, dry texture', families: ['woody', 'leather', 'smoky'] },
          { id: 'flowers', label: 'Flowers', text: 'Petals, garden air, clean softness', families: ['floral', 'green'] },
          { id: 'fresh', label: 'Fresh', text: 'Citrus, water, herbs, bright morning', families: ['citrus', 'aquatic', 'aromatic'] },
          { id: 'warm', label: 'Warm', text: 'Amber, spice, sweetness, evening depth', families: ['oriental', 'gourmand', 'spicy'] },
        ],
      },
      {
        key: 'occasion',
        eyebrow: 'Moment',
        title: 'Where will you wear it most?',
        helper: 'Occasion adjusts the tone: daytime clarity, evening warmth, or safe gifting.',
        choices: [
          { id: 'daily', label: 'Daily', text: 'Office, daytime, close conversation', families: ['citrus', 'green', 'aromatic'], occasion: 'day' },
          { id: 'evening', label: 'Evening', text: 'Dinner, dates, low light', families: ['amber', 'oriental', 'woody', 'leather'], occasion: 'evening' },
          { id: 'gift', label: 'Gift', text: 'Easy to love, polished, not too sharp', families: ['floral', 'fresh', 'woody'], occasion: 'gift' },
          { id: 'statement', label: 'Statement', text: 'Memorable entrance, stronger trail', families: ['smoky', 'leather', 'oud', 'gourmand'], occasion: 'evening' },
        ],
      },
      {
        key: 'presence',
        eyebrow: 'Presence',
        title: 'How much should people notice it?',
        helper: 'Choose the projection level you want before seeing the results.',
        choices: [
          { id: 'quiet', label: 'Quiet', text: 'Skin-close and refined', presence: 'quiet' },
          { id: 'balanced', label: 'Balanced', text: 'Noticeable but controlled', presence: 'balanced' },
          { id: 'bold', label: 'Bold', text: 'Long-lasting and expressive', presence: 'bold' },
          { id: 'surprise', label: 'Surprise me', text: 'Let the strongest match decide', presence: 'balanced' },
        ],
      },
    ],
    reasons: {
      family: 'Shares your {family} direction.',
      gender: 'Fits the {style} style preference.',
      occasion: 'Works for {occasion}.',
      presenceQuiet: 'Chosen for a quieter, easy-wearing profile.',
      presenceBalanced: 'Balanced rating and presence for regular wear.',
      presenceBold: 'Has stronger materials for a memorable trail.',
      rating: 'Strong catalog rating compared with nearby options.',
    },
  },
  ru: {
    eyebrow: 'Подбор аромата',
    title: 'Найдите аромат под ваш стиль',
    intro: 'Ответьте на четыре коротких вопроса, и Labor подберет ароматы из каталога под настроение, шлейф и образ.',
    start: 'Начать подбор',
    progress: 'Вопрос {current} из {total}',
    back: 'Назад',
    restart: 'Сначала',
    resultsEyebrow: 'Ваш выбор',
    resultsTitle: 'Три аромата, с которых стоит начать',
    resultsIntro: 'Подбор рассчитан по данным каталога Labor и вашим ответам.',
    match: 'Совпадение',
    view: 'Смотреть аромат',
    add: 'В корзину',
    added: 'Добавлено',
    emptyTitle: 'Для подбора нужен каталог',
    emptyBody: 'Сейчас не удалось загрузить достаточно товаров. Повторите, когда API каталога будет доступен.',
    steps: [
      {
        key: 'style',
        eyebrow: 'Стиль',
        title: 'Для кого этот аромат?',
        helper: 'Выберите ближайшее направление. Унисекс оставляет подбор шире.',
        choices: [
          { id: 'unisex', label: 'Свободно', text: 'Гибкая сигнатура под любой гардероб', gender: 'unisex' },
          { id: 'men', label: 'Мужской', text: 'Чистый, древесный, уверенный', gender: 'men' },
          { id: 'women', label: 'Женский', text: 'Мягкий, сияющий, цветочный', gender: 'women' },
          { id: 'neutral', label: 'Без правила', text: 'Не учитывать пол, только ноты' },
        ],
      },
      {
        key: 'family',
        eyebrow: 'Семья',
        title: 'К какому миру вас тянет?',
        helper: 'Это главный сигнал для подбора.',
        choices: [
          { id: 'woods', label: 'Дерево', text: 'Сандал, кедр, дым, сухая фактура', families: ['woody', 'leather', 'smoky'] },
          { id: 'flowers', label: 'Цветы', text: 'Лепестки, садовый воздух, мягкость', families: ['floral', 'green'] },
          { id: 'fresh', label: 'Свежесть', text: 'Цитрус, вода, травы, утро', families: ['citrus', 'aquatic', 'aromatic'] },
          { id: 'warm', label: 'Тепло', text: 'Амбра, специи, сладость, вечер', families: ['oriental', 'gourmand', 'spicy'] },
        ],
      },
      {
        key: 'occasion',
        eyebrow: 'Момент',
        title: 'Где вы будете носить его чаще?',
        helper: 'Сценарий меняет тон: день, вечер или подарок.',
        choices: [
          { id: 'daily', label: 'Каждый день', text: 'Офис, день, близкое общение', families: ['citrus', 'green', 'aromatic'], occasion: 'day' },
          { id: 'evening', label: 'Вечер', text: 'Ужин, свидание, мягкий свет', families: ['amber', 'oriental', 'woody', 'leather'], occasion: 'evening' },
          { id: 'gift', label: 'Подарок', text: 'Понятный, аккуратный, без резкости', families: ['floral', 'fresh', 'woody'], occasion: 'gift' },
          { id: 'statement', label: 'Заявление', text: 'Запоминающийся вход и шлейф', families: ['smoky', 'leather', 'oud', 'gourmand'], occasion: 'evening' },
        ],
      },
      {
        key: 'presence',
        eyebrow: 'Шлейф',
        title: 'Насколько заметным он должен быть?',
        helper: 'Выберите желаемую громкость перед результатами.',
        choices: [
          { id: 'quiet', label: 'Тихий', text: 'Близко к коже и спокойно', presence: 'quiet' },
          { id: 'balanced', label: 'Баланс', text: 'Заметный, но контролируемый', presence: 'balanced' },
          { id: 'bold', label: 'Сильный', text: 'Стойкий и выразительный', presence: 'bold' },
          { id: 'surprise', label: 'Удивите', text: 'Пусть решит лучший матч', presence: 'balanced' },
        ],
      },
    ],
    reasons: {
      family: 'Совпадает с направлением {family}.',
      gender: 'Подходит под стиль {style}.',
      occasion: 'Уместен для сценария: {occasion}.',
      presenceQuiet: 'Выбран за спокойный профиль.',
      presenceBalanced: 'Хороший баланс оценки и носибельности.',
      presenceBold: 'Есть более выразительные материалы для шлейфа.',
      rating: 'Сильная оценка в каталоге.',
    },
  },
  uz: {
    eyebrow: 'Atir tanlash',
    title: 'Uslubingizga mos atirni toping',
    intro: 'Toʻrtta savolga javob bering, Labor katalogdan kayfiyat, vaziyat va ifor kuchiga mos atirlarni tanlaydi.',
    start: 'Boshlash',
    progress: 'Savol {current}/{total}',
    back: 'Orqaga',
    restart: 'Qayta boshlash',
    resultsEyebrow: 'Tanlovingiz',
    resultsTitle: 'Avval sinab ko‘rishga arziydigan uch atir',
    resultsIntro: 'Natijalar Labor katalogi va javoblaringiz asosida hisoblandi.',
    match: 'Moslik',
    view: 'Atirni ko‘rish',
    add: 'Savatga',
    added: 'Qo‘shildi',
    emptyTitle: 'Tanlov uchun katalog kerak',
    emptyBody: 'Hozir mahsulotlar yuklanmadi. Katalog API ishlaganda qayta urinib ko‘ring.',
    steps: [
      {
        key: 'style',
        eyebrow: 'Uslub',
        title: 'Bu atir kim uchun?',
        helper: 'Eng yaqin yo‘nalishni tanlang. Uniseks tanlovni kengroq qoldiradi.',
        choices: [
          { id: 'unisex', label: 'Erkin', text: 'Har qanday obrazga mos signature', gender: 'unisex' },
          { id: 'men', label: 'Erkak', text: 'Toza, yog‘ochli, ishonchli', gender: 'men' },
          { id: 'women', label: 'Ayol', text: 'Yumshoq, yorqin, gulli', gender: 'women' },
          { id: 'neutral', label: 'Farqi yo‘q', text: 'Jins emas, notalar muhim' },
        ],
      },
      {
        key: 'family',
        eyebrow: 'Oila',
        title: 'Qaysi dunyo sizga yaqin?',
        helper: 'Bu moslikdagi eng kuchli signal.',
        choices: [
          { id: 'woods', label: 'Yog‘och', text: 'Sandal, kedr, tutun, quruq ohang', families: ['woody', 'leather', 'smoky'] },
          { id: 'flowers', label: 'Gullar', text: 'Barglar, bog‘ havosi, yumshoqlik', families: ['floral', 'green'] },
          { id: 'fresh', label: 'Fresh', text: 'Sitrus, suv, ko‘kat, tong', families: ['citrus', 'aquatic', 'aromatic'] },
          { id: 'warm', label: 'Iliq', text: 'Ambra, ziravor, shirinlik, kech', families: ['oriental', 'gourmand', 'spicy'] },
        ],
      },
      {
        key: 'occasion',
        eyebrow: 'Vaziyat',
        title: 'Uni ko‘proq qayerda ishlatasiz?',
        helper: 'Vaziyat atir ohangini aniqlaydi.',
        choices: [
          { id: 'daily', label: 'Har kuni', text: 'Ofis, kunduz, yaqin suhbat', families: ['citrus', 'green', 'aromatic'], occasion: 'day' },
          { id: 'evening', label: 'Kechki', text: 'Kechki ovqat, uchrashuv, past yorug‘lik', families: ['amber', 'oriental', 'woody', 'leather'], occasion: 'evening' },
          { id: 'gift', label: 'Sovg‘a', text: 'Hammaga yoqimli, silliq, xavfsiz', families: ['floral', 'fresh', 'woody'], occasion: 'gift' },
          { id: 'statement', label: 'Ta’sirli', text: 'Esda qoladigan kirish va shleyf', families: ['smoky', 'leather', 'oud', 'gourmand'], occasion: 'evening' },
        ],
      },
      {
        key: 'presence',
        eyebrow: 'Kuch',
        title: 'Atir qanchalik sezilsin?',
        helper: 'Natijadan oldin kerakli ifor kuchini tanlang.',
        choices: [
          { id: 'quiet', label: 'Sokin', text: 'Teri yaqinida, nozik', presence: 'quiet' },
          { id: 'balanced', label: 'Balans', text: 'Seziladi, lekin nazoratli', presence: 'balanced' },
          { id: 'bold', label: 'Kuchli', text: 'Uzoq turuvchi va ifodali', presence: 'bold' },
          { id: 'surprise', label: 'Hayrat', text: 'Eng yaxshi moslik hal qilsin', presence: 'balanced' },
        ],
      },
    ],
    reasons: {
      family: '{family} yo‘nalishiga mos.',
      gender: '{style} uslubiga mos keladi.',
      occasion: '{occasion} uchun yaxshi.',
      presenceQuiet: 'Sokin va oson taqiladigan profil.',
      presenceBalanced: 'Reyting va taqilish balansi yaxshi.',
      presenceBold: 'Shleyf uchun kuchliroq materiallar bor.',
      rating: 'Katalogdagi reytingi kuchli.',
    },
  },
  uzc: {
    eyebrow: 'Атир танлаш',
    title: 'Услубингизга мос атирни топинг',
    intro: 'Тўртта саволга жавоб беринг, Labor каталогдан кайфият, вазият ва ифор кучига мос атирларни танлайди.',
    start: 'Бошлаш',
    progress: 'Савол {current}/{total}',
    back: 'Орқага',
    restart: 'Қайта бошлаш',
    resultsEyebrow: 'Танловингиз',
    resultsTitle: 'Аввал синаб кўришга арзийдиган уч атир',
    resultsIntro: 'Натижалар Labor каталоги ва жавобларингиз асосида ҳисобланди.',
    match: 'Мослик',
    view: 'Атирни кўриш',
    add: 'Саватга',
    added: 'Қўшилди',
    emptyTitle: 'Танлов учун каталог керак',
    emptyBody: 'Ҳозир маҳсулотлар юкланмади. Каталог API ишлаганда қайта уриниб кўринг.',
    steps: [
      {
        key: 'style',
        eyebrow: 'Услуб',
        title: 'Бу атир ким учун?',
        helper: 'Энг яқин йўналишни танланг. Унисекс танловни кенгроқ қолдиради.',
        choices: [
          { id: 'unisex', label: 'Эркин', text: 'Ҳар қандай образга мос signature', gender: 'unisex' },
          { id: 'men', label: 'Эркак', text: 'Тоза, ёғочли, ишончли', gender: 'men' },
          { id: 'women', label: 'Аёл', text: 'Юмшоқ, ёрқин, гулли', gender: 'women' },
          { id: 'neutral', label: 'Фарқи йўқ', text: 'Жинс эмас, ноталар муҳим' },
        ],
      },
      {
        key: 'family',
        eyebrow: 'Оила',
        title: 'Қайси дунё сизга яқин?',
        helper: 'Бу мосликдаги энг кучли сигнал.',
        choices: [
          { id: 'woods', label: 'Ёғоч', text: 'Сандал, кедр, тутун, қуруқ оҳанг', families: ['woody', 'leather', 'smoky'] },
          { id: 'flowers', label: 'Гуллар', text: 'Барглар, боғ ҳавоси, юмшоқлик', families: ['floral', 'green'] },
          { id: 'fresh', label: 'Fresh', text: 'Цитрус, сув, кўкат, тонг', families: ['citrus', 'aquatic', 'aromatic'] },
          { id: 'warm', label: 'Илиқ', text: 'Амбра, зиравор, ширинлик, кеч', families: ['oriental', 'gourmand', 'spicy'] },
        ],
      },
      {
        key: 'occasion',
        eyebrow: 'Вазият',
        title: 'Уни кўпроқ қаерда ишлатасиз?',
        helper: 'Вазият атир оҳангини аниқлайди.',
        choices: [
          { id: 'daily', label: 'Ҳар куни', text: 'Офис, кундуз, яқин суҳбат', families: ['citrus', 'green', 'aromatic'], occasion: 'day' },
          { id: 'evening', label: 'Кечки', text: 'Кечки овқат, учрашув, паст ёруғлик', families: ['amber', 'oriental', 'woody', 'leather'], occasion: 'evening' },
          { id: 'gift', label: 'Совға', text: 'Ҳаммага ёқимли, силлиқ, хавфсиз', families: ['floral', 'fresh', 'woody'], occasion: 'gift' },
          { id: 'statement', label: 'Таъсирли', text: 'Эсда қоладиган кириш ва шлейф', families: ['smoky', 'leather', 'oud', 'gourmand'], occasion: 'evening' },
        ],
      },
      {
        key: 'presence',
        eyebrow: 'Куч',
        title: 'Атир қанчалик сезилсин?',
        helper: 'Натижадан олдин керакли ифор кучини танланг.',
        choices: [
          { id: 'quiet', label: 'Сокин', text: 'Тери яқинида, нозик', presence: 'quiet' },
          { id: 'balanced', label: 'Баланс', text: 'Сезилади, лекин назоратли', presence: 'balanced' },
          { id: 'bold', label: 'Кучли', text: 'Узоқ турувчи ва ифодали', presence: 'bold' },
          { id: 'surprise', label: 'Ҳайрат', text: 'Энг яхши мослик ҳал қилсин', presence: 'balanced' },
        ],
      },
    ],
    reasons: {
      family: '{family} йўналишига мос.',
      gender: '{style} услубига мос келади.',
      occasion: '{occasion} учун яхши.',
      presenceQuiet: 'Сокин ва осон тақиладиган профиль.',
      presenceBalanced: 'Рейтинг ва тақилиш баланси яхши.',
      presenceBold: 'Шлейф учун кучлироқ материаллар бор.',
      rating: 'Каталог рейтинги кучли.',
    },
  },
};

export default async function FindYourPerfumePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = toLang(locale);
  const candidates = await loadCandidates(locale);

  return <PerfumeFinderClient locale={locale} candidates={candidates} copy={COPY[lang]} />;
}

async function loadCandidates(locale: string): Promise<FinderCandidate[]> {
  const requests: Promise<{ tag: string; products: ProductCard[] }>[] = [
    listProducts({ locale, sort: 'popular' }).then((res) => ({ tag: 'popular', products: res.data })),
    ...FAMILY_FILTERS.map((family) =>
      listProducts({ locale, family, sort: 'popular' }).then((res) => ({ tag: `family:${family}`, products: res.data })),
    ),
    ...GENDER_FILTERS.map((gender) =>
      listProducts({ locale, gender, sort: 'popular' }).then((res) => ({ tag: `gender:${gender}`, products: res.data })),
    ),
  ];

  const settled = await Promise.allSettled(requests);
  const byId = new Map<number, FinderCandidate>();

  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    const { tag, products } = result.value;

    for (const product of products) {
      const existing = byId.get(product.id);
      const next = existing ?? toCandidate(product);

      if (tag.startsWith('family:')) {
        const family = tag.slice('family:'.length);
        if (!next.matchedFamilies.includes(family)) next.matchedFamilies.push(family);
      }

      if (tag.startsWith('gender:')) {
        next.matchedGender = tag.slice('gender:'.length);
      }

      byId.set(product.id, next);
    }
  }

  return Array.from(byId.values()).slice(0, 80);
}

function toCandidate(product: ProductCard): FinderCandidate {
  const topAccord = product.top_accord?.name.toLowerCase();

  return {
    ...product,
    matchedFamilies: topAccord ? [topAccord] : [],
  };
}
