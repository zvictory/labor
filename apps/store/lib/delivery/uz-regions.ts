// Uzbekistan regions (viloyat) and districts (tuman), used by the checkout
// address selector. Dataset copied near-verbatim from bebio (lib/uz-regions.ts).
// Names carry both uz-Latin and ru forms; each region has approximate center
// coordinates for delivery-quote geocoding fallbacks.

export interface District {
  name_uz: string;
  name_ru: string;
}

export interface Region {
  name_uz: string;
  name_ru: string;
  center: { lat: number; lng: number };
  districts: District[];
}

export const UZ_REGIONS: Region[] = [
  {
    name_uz: 'Toshkent shahri',
    name_ru: 'город Ташкент',
    center: { lat: 41.2995, lng: 69.2401 },
    districts: [
      { name_uz: 'Bektemir', name_ru: 'Бектемир' },
      { name_uz: 'Chilonzor', name_ru: 'Чиланзар' },
      { name_uz: 'Hamza', name_ru: 'Хамза' },
      { name_uz: 'Mirobod', name_ru: 'Мирабад' },
      { name_uz: "Mirzo Ulug'bek", name_ru: 'Мирзо-Улугбек' },
      { name_uz: 'Sergeli', name_ru: 'Сергели' },
      { name_uz: 'Shayxontohur', name_ru: 'Шайхантахур' },
      { name_uz: 'Olmazor', name_ru: 'Алмазар' },
      { name_uz: 'Uchtepa', name_ru: 'Учтепа' },
      { name_uz: 'Yakkasaroy', name_ru: 'Яккасарай' },
      { name_uz: 'Yunusobod', name_ru: 'Юнусабад' },
    ],
  },
  {
    name_uz: 'Toshkent viloyati',
    name_ru: 'Ташкентская область',
    center: { lat: 41.1123, lng: 69.2932 },
    districts: [
      { name_uz: 'Bekabad', name_ru: 'Бекабад' },
      { name_uz: "Bo'ka", name_ru: 'Бука' },
      { name_uz: "Bo'stonliq", name_ru: 'Бустанлык' },
      { name_uz: 'Chinoz', name_ru: 'Чиназ' },
      { name_uz: 'Chirchiq', name_ru: 'Чирчик' },
      { name_uz: 'Qibray', name_ru: 'Кибрай' },
      { name_uz: 'Nurafshon', name_ru: 'Нурафшан' },
      { name_uz: 'Ohangaron', name_ru: 'Ахангаран' },
      { name_uz: 'Olmaliq', name_ru: 'Алмалык' },
      { name_uz: "Oqqo'rg'on", name_ru: 'Аккурган' },
      { name_uz: 'Parkent', name_ru: 'Паркент' },
      { name_uz: 'Piskent', name_ru: 'Пискент' },
      { name_uz: 'Quyi Chirchiq', name_ru: 'Нижнечирчикский' },
      { name_uz: "Yangiyo'l", name_ru: 'Янгиюль' },
      { name_uz: 'Zangiota', name_ru: 'Зангиата' },
    ],
  },
  {
    name_uz: 'Samarqand viloyati',
    name_ru: 'Самаркандская область',
    center: { lat: 39.6542, lng: 66.9597 },
    districts: [
      { name_uz: 'Samarqand', name_ru: 'Самарканд' },
      { name_uz: "Bulung'ur", name_ru: 'Булунгур' },
      { name_uz: 'Ishtixon', name_ru: 'Иштихан' },
      { name_uz: 'Jomboy', name_ru: 'Джамбай' },
      { name_uz: "Kattaqo'rg'on", name_ru: 'Каттакурган' },
      { name_uz: 'Narpay', name_ru: 'Нарпай' },
      { name_uz: 'Nurobod', name_ru: 'Нурабад' },
      { name_uz: 'Oqdaryo', name_ru: 'Акдарья' },
      { name_uz: 'Payariq', name_ru: 'Пайарык' },
      { name_uz: "Pastdarg'om", name_ru: 'Пастдаргом' },
      { name_uz: "Qo'shrabot", name_ru: 'Кушрабат' },
      { name_uz: 'Toyloq', name_ru: 'Тайлак' },
      { name_uz: 'Urgut', name_ru: 'Ургут' },
    ],
  },
  {
    name_uz: "Farg'ona viloyati",
    name_ru: 'Ферганская область',
    center: { lat: 40.3842, lng: 71.7843 },
    districts: [
      { name_uz: "Farg'ona", name_ru: 'Фергана' },
      { name_uz: 'Beshariq', name_ru: 'Бешарик' },
      { name_uz: "Bog'dod", name_ru: 'Багдад' },
      { name_uz: "Dang'ara", name_ru: 'Дангара' },
      { name_uz: 'Furqat', name_ru: 'Фуркат' },
      { name_uz: "Marg'ilon", name_ru: 'Маргилан' },
      { name_uz: "Qo'shtepa", name_ru: 'Куштепа' },
      { name_uz: 'Quva', name_ru: 'Кува' },
      { name_uz: 'Oltiariq', name_ru: 'Алтыарык' },
      { name_uz: 'Ozbekiston', name_ru: 'Узбекистан' },
      { name_uz: 'Rishton', name_ru: 'Риштан' },
      { name_uz: "So'x", name_ru: 'Сох' },
      { name_uz: 'Toshloq', name_ru: 'Ташлак' },
      { name_uz: "Uchko'prik", name_ru: 'Учкуприк' },
      { name_uz: 'Yozyovon', name_ru: 'Язъяван' },
    ],
  },
  {
    name_uz: 'Andijon viloyati',
    name_ru: 'Андижанская область',
    center: { lat: 40.7821, lng: 72.3442 },
    districts: [
      { name_uz: 'Andijon', name_ru: 'Андижан' },
      { name_uz: 'Asaka', name_ru: 'Асака' },
      { name_uz: 'Baliqchi', name_ru: 'Балыкчи' },
      { name_uz: "Bo'z", name_ru: 'Боз' },
      { name_uz: 'Buloqboshi', name_ru: 'Булакбаши' },
      { name_uz: 'Izboskan', name_ru: 'Избоскан' },
      { name_uz: 'Jalaquduq', name_ru: 'Джалакудук' },
      { name_uz: 'Marhamat', name_ru: 'Мархамат' },
      { name_uz: 'Oltinkol', name_ru: 'Олтинкол' },
      { name_uz: 'Paxtaobod', name_ru: 'Пахтаабад' },
      { name_uz: "Qo'rg'ontepa", name_ru: 'Кургантепа' },
      { name_uz: 'Shahrixon', name_ru: 'Шахрихан' },
      { name_uz: "Ulug'nor", name_ru: 'Улугнор' },
      { name_uz: "Xo'jaobod", name_ru: 'Ходжаабад' },
    ],
  },
  {
    name_uz: 'Namangan viloyati',
    name_ru: 'Наманганская область',
    center: { lat: 41.0011, lng: 71.6725 },
    districts: [
      { name_uz: 'Namangan', name_ru: 'Наманган' },
      { name_uz: 'Chortoq', name_ru: 'Чартак' },
      { name_uz: 'Chust', name_ru: 'Чуст' },
      { name_uz: 'Kosonsoy', name_ru: 'Касансай' },
      { name_uz: 'Mingbuloq', name_ru: 'Мингбулак' },
      { name_uz: 'Norin', name_ru: 'Нарын' },
      { name_uz: 'Pop', name_ru: 'Поп' },
      { name_uz: "To'raqo'rg'on", name_ru: 'Туракурган' },
      { name_uz: "Uchqo'rg'on", name_ru: 'Учкурган' },
      { name_uz: "Yangiqo'rg'on", name_ru: 'Янгикурган' },
    ],
  },
  {
    name_uz: 'Buxoro viloyati',
    name_ru: 'Бухарская область',
    center: { lat: 39.7747, lng: 64.4286 },
    districts: [
      { name_uz: 'Buxoro', name_ru: 'Бухара' },
      { name_uz: "G'ijduvon", name_ru: 'Гиждуван' },
      { name_uz: 'Jondor', name_ru: 'Джондор' },
      { name_uz: 'Kogon', name_ru: 'Каган' },
      { name_uz: 'Olot', name_ru: 'Алат' },
      { name_uz: 'Peshku', name_ru: 'Пешку' },
      { name_uz: 'Qorovulbozor', name_ru: 'Каравулбазар' },
      { name_uz: 'Romitan', name_ru: 'Ромитан' },
      { name_uz: 'Shofirkon', name_ru: 'Шафиркан' },
      { name_uz: 'Vobkent', name_ru: 'Вабкент' },
    ],
  },
  {
    name_uz: 'Xorazm viloyati',
    name_ru: 'Хорезмская область',
    center: { lat: 41.5475, lng: 60.6323 },
    districts: [
      { name_uz: 'Urganch', name_ru: 'Ургенч' },
      { name_uz: "Bog'ot", name_ru: 'Багат' },
      { name_uz: 'Gurlan', name_ru: 'Гурлен' },
      { name_uz: 'Xiva', name_ru: 'Хива' },
      { name_uz: 'Xonqa', name_ru: 'Ханка' },
      { name_uz: "Qo'shko'pir", name_ru: 'Кушкупыр' },
      { name_uz: 'Shovot', name_ru: 'Шават' },
      { name_uz: "Tuproqqal'a", name_ru: 'Тупраккала' },
      { name_uz: 'Yangibozor', name_ru: 'Янгибазар' },
    ],
  },
  {
    name_uz: 'Qashqadaryo viloyati',
    name_ru: 'Кашкадарьинская область',
    center: { lat: 38.86, lng: 65.79 },
    districts: [
      { name_uz: 'Qarshi', name_ru: 'Карши' },
      { name_uz: 'Chiroqchi', name_ru: 'Чиракчи' },
      { name_uz: 'Dehqonobod', name_ru: 'Дехканабад' },
      { name_uz: "G'uzor", name_ru: 'Гузар' },
      { name_uz: 'Kasbi', name_ru: 'Касби' },
      { name_uz: 'Kitob', name_ru: 'Китаб' },
      { name_uz: 'Koson', name_ru: 'Касан' },
      { name_uz: 'Mirishkor', name_ru: 'Миришкор' },
      { name_uz: 'Muborak', name_ru: 'Мубарек' },
      { name_uz: 'Nishon', name_ru: 'Нишан' },
      { name_uz: 'Shaxrisabz', name_ru: 'Шахрисабз' },
      { name_uz: "Yakkabog'", name_ru: 'Яккабаг' },
    ],
  },
  {
    name_uz: 'Surxondaryo viloyati',
    name_ru: 'Сурхандарьинская область',
    center: { lat: 37.9401, lng: 67.5698 },
    districts: [
      { name_uz: 'Termiz', name_ru: 'Термез' },
      { name_uz: 'Angor', name_ru: 'Ангор' },
      { name_uz: 'Bandixon', name_ru: 'Бандихан' },
      { name_uz: 'Boysun', name_ru: 'Байсун' },
      { name_uz: 'Denov', name_ru: 'Денау' },
      { name_uz: "Jarqo'rg'on", name_ru: 'Джаркурган' },
      { name_uz: 'Muzrabot', name_ru: 'Музрабад' },
      { name_uz: 'Oltinsoy', name_ru: 'Алтынсай' },
      { name_uz: "Qumqo'rg'on", name_ru: 'Кумкурган' },
      { name_uz: 'Sariosiyo', name_ru: 'Сариасия' },
      { name_uz: 'Sherobod', name_ru: 'Шерабад' },
      { name_uz: "Sho'rchi", name_ru: 'Шурчи' },
      { name_uz: 'Uzun', name_ru: 'Узун' },
    ],
  },
  {
    name_uz: 'Jizzax viloyati',
    name_ru: 'Джизакская область',
    center: { lat: 40.1158, lng: 67.8422 },
    districts: [
      { name_uz: 'Jizzax', name_ru: 'Джизак' },
      { name_uz: 'Arnasoy', name_ru: 'Арнасай' },
      { name_uz: 'Baxmal', name_ru: 'Бахмал' },
      { name_uz: "Do'stlik", name_ru: 'Дустлик' },
      { name_uz: 'Forish', name_ru: 'Фариш' },
      { name_uz: "G'allaorol", name_ru: 'Галляарал' },
      { name_uz: "Mirzacho'l", name_ru: 'Мирзачуль' },
      { name_uz: 'Paxtakor', name_ru: 'Пахтакор' },
      { name_uz: 'Yangiobod', name_ru: 'Янгиабад' },
      { name_uz: 'Zafarobod', name_ru: 'Зафарабад' },
      { name_uz: 'Zarbdor', name_ru: 'Зарбдор' },
      { name_uz: 'Zomin', name_ru: 'Зомин' },
    ],
  },
  {
    name_uz: 'Sirdaryo viloyati',
    name_ru: 'Сырдарьинская область',
    center: { lat: 40.8415, lng: 68.6647 },
    districts: [
      { name_uz: 'Guliston', name_ru: 'Гулистан' },
      { name_uz: 'Boyovut', name_ru: 'Баяут' },
      { name_uz: 'Gurlan', name_ru: 'Гурлан' },
      { name_uz: 'Mirzaobod', name_ru: 'Мирзаабад' },
      { name_uz: 'Oqoltin', name_ru: 'Акалтын' },
      { name_uz: 'Sardoba', name_ru: 'Сардоба' },
      { name_uz: 'Sayxunobod', name_ru: 'Сайхунабад' },
      { name_uz: 'Shirin', name_ru: 'Ширин' },
      { name_uz: 'Xovos', name_ru: 'Хавас' },
    ],
  },
  {
    name_uz: 'Navoiy viloyati',
    name_ru: 'Навоийская область',
    center: { lat: 40.084, lng: 65.3792 },
    districts: [
      { name_uz: 'Navoiy', name_ru: 'Навои' },
      { name_uz: 'Karmana', name_ru: 'Кармана' },
      { name_uz: 'Konimex', name_ru: 'Конимех' },
      { name_uz: 'Navbahor', name_ru: 'Навбахор' },
      { name_uz: 'Nurota', name_ru: 'Нурата' },
      { name_uz: 'Qiziltepa', name_ru: 'Кызылтепа' },
      { name_uz: 'Tomdi', name_ru: 'Томди' },
      { name_uz: 'Uchquduq', name_ru: 'Учкудук' },
      { name_uz: 'Xatirchi', name_ru: 'Хатирчи' },
      { name_uz: 'Zarafshon', name_ru: 'Зарафшан' },
    ],
  },
  {
    name_uz: "Qoraqalpog'iston Respublikasi",
    name_ru: 'Республика Каракалпакстан',
    center: { lat: 42.4608, lng: 59.6166 },
    districts: [
      { name_uz: 'Nukus', name_ru: 'Нукус' },
      { name_uz: 'Amudaryo', name_ru: 'Амударья' },
      { name_uz: 'Beruniy', name_ru: 'Беруний' },
      { name_uz: 'Chimboy', name_ru: 'Чимбай' },
      { name_uz: "Ellikqal'a", name_ru: 'Элликкала' },
      { name_uz: 'Kegeyli', name_ru: 'Кегейли' },
      { name_uz: "Mo'ynoq", name_ru: 'Муйнак' },
      { name_uz: "Qo'ng'irot", name_ru: 'Кунград' },
      { name_uz: "Qorao'zak", name_ru: 'Кара-Узяк' },
      { name_uz: 'Shumanay', name_ru: 'Шуманай' },
      { name_uz: "Taxtako'pir", name_ru: 'Тахиаташ' },
      { name_uz: "To'rtko'l", name_ru: 'Турткуль' },
      { name_uz: "Xo'jayli", name_ru: 'Ходжейли' },
    ],
  },
];

/// Look up a region by its uz or ru name (case-insensitive).
export function findRegion(name: string): Region | undefined {
  const n = name.trim().toLowerCase();
  return UZ_REGIONS.find(
    (r) => r.name_uz.toLowerCase() === n || r.name_ru.toLowerCase() === n,
  );
}

/// True for the Tashkent-city region (drives the courier-tashkent method).
export function isTashkentCity(regionName: string): boolean {
  const r = findRegion(regionName);
  return r?.name_uz === 'Toshkent shahri';
}
