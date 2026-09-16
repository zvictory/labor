// Accord names in Russian and Uzbek.
//
// Like the notes, the import copied the English name into every locale key, so
// the accord scale on the product page and the accord line on every product
// card read «WOODY · CITRUS» on a Russian page. There are only 64 accords, and
// each one is printed on nearly every card, which makes this the shortest list
// with the widest reach in the catalogue.
//
// Accords describe a character, so they are adjectives where the language
// allows (древесный, yogʻochli) — the same forms the generated description
// uses for families. Uzbek is Latin with U+02BB.
//
// Applied by `scripts/translate-notes.ts --accords`, which only writes a key
// that still holds the English string.
import type { NoteTranslation } from './note-translations';

export const ACCORD_TRANSLATIONS: Record<string, NoteTranslation> = {
  alcohol: { ru: 'алкогольный', uz: 'spirtli' },
  aldehydic: { ru: 'альдегидный', uz: 'aldegidli' },
  almond: { ru: 'миндальный', uz: 'bodomli' },
  amber: { ru: 'амбровый', uz: 'ambrali' },
  animalic: { ru: 'анималистический', uz: 'hayvoniy' },
  anis: { ru: 'анисовый', uz: 'anisli' },
  aquatic: { ru: 'водный', uz: 'suvli' },
  aromatic: { ru: 'ароматический', uz: 'aromatik' },
  balsamic: { ru: 'смолистый', uz: 'balzamik' },
  bitter: { ru: 'горький', uz: 'achchiq' },
  cacao: { ru: 'какао', uz: 'kakao' },
  camphor: { ru: 'камфорный', uz: 'kamforali' },
  cannabis: { ru: 'каннабис', uz: 'kannabis' },
  caramel: { ru: 'карамельный', uz: 'karamelli' },
  champagne: { ru: 'шампанское', uz: 'shampan' },
  cherry: { ru: 'вишнёвый', uz: 'olchali' },
  chocolate: { ru: 'шоколадный', uz: 'shokoladli' },
  cinnamon: { ru: 'коричный', uz: 'dolchinli' },
  citrus: { ru: 'цитрусовый', uz: 'sitrusli' },
  coconut: { ru: 'кокосовый', uz: 'kokosli' },
  coffee: { ru: 'кофейный', uz: 'qahvali' },
  conifer: { ru: 'хвойный', uz: 'ignabargli' },
  earthy: { ru: 'землистый', uz: 'tuproqli' },
  floral: { ru: 'цветочный', uz: 'gulli' },
  fresh: { ru: 'свежий', uz: 'salqin' },
  'fresh-spicy': { ru: 'свежий пряный', uz: 'salqin ziravorli' },
  fruity: { ru: 'фруктовый', uz: 'mevali' },
  green: { ru: 'зелёный', uz: 'yashil' },
  herbal: { ru: 'травяной', uz: 'oʻtli' },
  honey: { ru: 'медовый', uz: 'asalli' },
  iris: { ru: 'ирисовый', uz: 'irisli' },
  lactonic: { ru: 'лактонный', uz: 'laktonli' },
  lavender: { ru: 'лавандовый', uz: 'lavandali' },
  leather: { ru: 'кожаный', uz: 'charmli' },
  marine: { ru: 'морской', uz: 'dengiz' },
  metallic: { ru: 'металлический', uz: 'metalli' },
  mineral: { ru: 'минеральный', uz: 'mineral' },
  mossy: { ru: 'мшистый', uz: 'moxli' },
  musky: { ru: 'мускусный', uz: 'muskusli' },
  nutty: { ru: 'ореховый', uz: 'yongʻoqli' },
  oud: { ru: 'уд', uz: 'ud' },
  ozonic: { ru: 'озоновый', uz: 'ozonli' },
  patchouli: { ru: 'пачули', uz: 'pachuli' },
  powdery: { ru: 'пудровый', uz: 'upali' },
  rose: { ru: 'розовый', uz: 'atirgulli' },
  rum: { ru: 'ромовый', uz: 'romli' },
  salty: { ru: 'солёный', uz: 'shoʻr' },
  savory: { ru: 'пикантный', uz: 'pikant' },
  smoky: { ru: 'дымный', uz: 'tutunli' },
  soapy: { ru: 'мыльный', uz: 'sovunli' },
  'soft-spicy': { ru: 'мягкий пряный', uz: 'yumshoq ziravorli' },
  sweet: { ru: 'сладкий', uz: 'shirin' },
  terpenic: { ru: 'терпеновый', uz: 'terpenli' },
  tobacco: { ru: 'табачный', uz: 'tamakili' },
  tropical: { ru: 'тропический', uz: 'tropik' },
  tuberose: { ru: 'тубероза', uz: 'tuberozali' },
  vanilla: { ru: 'ванильный', uz: 'vanilli' },
  violet: { ru: 'фиалковый', uz: 'binafshali' },
  vodka: { ru: 'водка', uz: 'aroq' },
  'warm-spicy': { ru: 'тёплый пряный', uz: 'iliq ziravorli' },
  whiskey: { ru: 'виски', uz: 'viski' },
  woody: { ru: 'древесный', uz: 'yogʻochli' },
  'white-floral': { ru: 'белые цветы', uz: 'oq gulli' },
  'yellow-floral': { ru: 'жёлтые цветы', uz: 'sariq gulli' },
};
