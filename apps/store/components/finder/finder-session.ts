import { z } from 'zod';
import type { AnswerKey, Answers, FinderCopy } from './finder-model';

export const FINDER_SESSION_KEY = 'labor.finder.v1';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const sessionSchema = z
  .object({
    ids: z
      .object({
        style: z.string().optional(),
        family: z.string().optional(),
        occasion: z.string().optional(),
        presence: z.string().optional(),
      })
      .strict(),
    step: z.number().int().nonnegative(),
    complete: z.boolean(),
    updatedAt: z.number().finite(),
  })
  .strict();

export type FinderSession = z.infer<typeof sessionSchema>;

export function finderAnswers(ids: FinderSession['ids'], steps: FinderCopy['steps']): Answers {
  const answers: Answers = {};
  for (const step of steps) {
    const choice = step.choices.find(({ id }) => id === ids[step.key]);
    if (choice) answers[step.key] = choice;
  }
  return answers;
}

export function parseFinderSession(raw: string, steps: FinderCopy['steps'], now = Date.now()) {
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const session = parsed.data;
    if (
      session.step >= steps.length ||
      session.updatedAt > now ||
      now - session.updatedAt >= MAX_AGE_MS
    )
      return null;
    const answers = finderAnswers(session.ids, steps);
    const keys = Object.keys(session.ids) as AnswerKey[];
    if (keys.some((key) => !answers[key])) return null;
    const firstMissing = steps.findIndex(({ key }) => !answers[key]);
    if (
      (session.complete && firstMissing !== -1) ||
      (firstMissing !== -1 && session.step > firstMissing)
    ) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}
