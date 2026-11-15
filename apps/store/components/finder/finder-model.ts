export interface FinderCandidate {
  id: number;
  slug: string;
  name: string;
  brand: string;
  price: number;
  image: string;
  avg_rating: number;
  top_accord?: { name: string; color_hex: string } | null | undefined;
  matchedFamilies: string[];
  matchedGender?: string;
  volumeOptions?: { ml: number; useDefault: boolean }[];
}

export type AnswerKey = 'style' | 'family' | 'occasion' | 'presence';

export interface Choice {
  id: string;
  label: string;
  text: string;
  families?: string[];
  gender?: string;
  occasion?: 'day' | 'evening' | 'gift';
  presence?: 'quiet' | 'balanced' | 'bold';
}

interface Step {
  key: AnswerKey;
  eyebrow: string;
  title: string;
  helper: string;
  choices: Choice[];
}

export interface FinderCopy {
  eyebrow: string;
  title: string;
  intro: string;
  start: string;
  continue: string;
  cardTitle: string;
  pending: string;
  cartError: string;
  progress: string;
  back: string;
  restart: string;
  resultsEyebrow: string;
  resultsTitle: string;
  resultsIntro: string;
  /** Above the results: the same perfumes as 2 ml samples, added together. */
  samplesLead: string;
  /** `{price}` is replaced with what the samples cost. */
  samplesCta: string;
  view: string;
  add: string;
  added: string;
  emptyTitle: string;
  emptyBody: string;
  steps: Step[];
  reasons: {
    family: string;
    gender: string;
    occasion: string;
    alternative: string;
  };
}

export type Answers = Partial<Record<AnswerKey, Choice>>;
const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const hasFamily = (product: FinderCandidate, families: string[]): boolean => {
  const productFamilies = product.matchedFamilies.map(normalize);
  const accord = product.top_accord ? normalize(product.top_accord.name) : '';
  return families.some((family) => productFamilies.includes(family) || accord.includes(family));
};

export const scoreProduct = (
  product: FinderCandidate,
  answers: Answers,
  copy: Pick<FinderCopy, 'reasons'>,
) => {
  let score = 42;
  const reasons: string[] = [];
  const familyChoice = answers.family;
  const styleChoice = answers.style;
  const occasionChoice = answers.occasion;
  const presenceChoice = answers.presence;

  if (familyChoice?.families && hasFamily(product, familyChoice.families)) {
    score += 24;
    reasons.push(copy.reasons.family.replace('{family}', familyChoice.label));
  }

  if (styleChoice?.gender && product.matchedGender === styleChoice.gender) {
    score += 16;
    reasons.push(copy.reasons.gender.replace('{style}', styleChoice.label));
  } else if (styleChoice?.gender === 'unisex' && !product.matchedGender) {
    score += 8;
  }

  if (occasionChoice?.families && hasFamily(product, occasionChoice.families)) {
    score += 14;
    reasons.push(copy.reasons.occasion.replace('{occasion}', occasionChoice.label));
  }

  if (presenceChoice?.presence === 'quiet') {
    if (product.price <= 1_000_000) {
      score += 10;
    } else {
      score += 4;
    }
  }

  if (presenceChoice?.presence === 'balanced') {
    if (product.avg_rating >= 7) {
      score += 12;
    } else {
      score += 6;
    }
  }

  if (presenceChoice?.presence === 'bold') {
    const boldFamilies = ['leather', 'smoky', 'amber', 'woody', 'oriental', 'spicy'];
    if (hasFamily(product, boldFamilies)) {
      score += 16;
    } else {
      score += 6;
    }
  }

  if (product.avg_rating >= 7.5) {
    score += 8;
  }

  return {
    product,
    score: Math.min(score, 98),
    reasons: reasons.length
      ? Array.from(new Set(reasons)).slice(0, 3)
      : [copy.reasons.alternative.replace('{family}', familyChoice?.label ?? '—')],
  };
};

export function rankProducts(
  candidates: FinderCandidate[],
  answers: Answers,
  copy: Pick<FinderCopy, 'reasons'>,
) {
  return candidates
    .map((product) => scoreProduct(product, answers, copy))
    .sort((a, b) => b.score - a.score || b.product.avg_rating - a.product.avg_rating)
    .slice(0, 3);
}
