// Brand and perfumer countries, as the reader's language names them.
//
// `country` is a plain string the catalogue import filled in English, so a
// Russian page printed «France · 26 ароматов». The column is not translated in
// the database because the admin form edits it as free text; the display turns
// it into a name here instead. A value outside this list prints as stored.

type CountryName = { readonly ru: string; readonly uz: string };

const COUNTRIES: Record<string, CountryName> = {
  Denmark: { ru: 'Дания', uz: 'Daniya' },
  France: { ru: 'Франция', uz: 'Fransiya' },
  Germany: { ru: 'Германия', uz: 'Germaniya' },
  Israel: { ru: 'Израиль', uz: 'Isroil' },
  Italy: { ru: 'Италия', uz: 'Italiya' },
  Netherlands: { ru: 'Нидерланды', uz: 'Niderlandiya' },
  Oman: { ru: 'Оман', uz: 'Ummon' },
  'Saudi Arabia': { ru: 'Саудовская Аравия', uz: 'Saudiya Arabistoni' },
  'South Korea': { ru: 'Южная Корея', uz: 'Janubiy Koreya' },
  Spain: { ru: 'Испания', uz: 'Ispaniya' },
  Sweden: { ru: 'Швеция', uz: 'Shvetsiya' },
  Switzerland: { ru: 'Швейцария', uz: 'Shveytsariya' },
  Turkey: { ru: 'Турция', uz: 'Turkiya' },
  'United Arab Emirates': { ru: 'ОАЭ', uz: 'BAA' },
  'United Kingdom': { ru: 'Великобритания', uz: 'Buyuk Britaniya' },
  'United States': { ru: 'США', uz: 'AQSH' },
  Uzbekistan: { ru: 'Узбекистан', uz: 'Oʻzbekiston' },
};

export const countryName = (country: string, locale: string): string => {
  if (locale !== 'ru' && locale !== 'uz') return country;
  return COUNTRIES[country]?.[locale] ?? country;
};
