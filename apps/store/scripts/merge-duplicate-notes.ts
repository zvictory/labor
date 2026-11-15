/** Default dry run. Writes are restricted to the isolated design-check database. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  equalLinks,
  planNoteMerge,
  rollbackNoteMergeState,
  type NoteLink,
} from '../lib/catalog/note-merge';

const linkSchema = z.object({
  id: z.number().int(),
  productId: z.number().int(),
  noteId: z.number().int(),
  pyramidLayer: z.string(),
  position: z.number().int(),
});
const auditSchema = z.object({
  target: z.string(),
  noteHash: z.string(),
  affectedIds: z.array(z.number()),
  before: z.array(linkSchema),
  after: z.array(linkSchema),
  notes: z.array(z.unknown()),
});
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const rollbackIndex = args.indexOf('--rollback');
const databaseIndex = args.indexOf('--database');
for (const [index, arg] of args.entries()) {
  if (arg === '--apply') continue;
  if (arg === '--rollback' || arg === '--database') {
    if (!args[index + 1] || args[index + 1]!.startsWith('--'))
      throw new Error(`Missing value for ${arg}`);
    continue;
  }
  if (
    (rollbackIndex >= 0 && index === rollbackIndex + 1) ||
    (databaseIndex >= 0 && index === databaseIndex + 1)
  )
    continue;
  throw new Error(`Unknown argument: ${arg}`);
}
const requestedDatabase = databaseIndex < 0 ? undefined : args[databaseIndex + 1];
const url = new URL(process.env.DATABASE_URL ?? '');
if (requestedDatabase) url.pathname = `/${requestedDatabase}`;
const database = decodeURIComponent(url.pathname.slice(1));
if (apply || rollbackIndex >= 0) {
  if (
    requestedDatabase !== 'labor_design_check_20261115' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
    throw new Error('Writes require --database labor_design_check_20261115 on localhost');
}
if (rollbackIndex >= 0 && !apply) throw new Error('Rollback requires --apply');
const target = `${url.hostname}:${url.port || '5432'}/${database}`;
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
const reportDirectory = fileURLToPath(
  new URL('../../../docs/design/note-merge-audits/', import.meta.url),
);

async function main() {
  await mkdir(reportDirectory, { recursive: true });
  await db.$transaction(
    async (tx) => {
      if (apply)
        await tx.$executeRawUnsafe(
          'LOCK TABLE "Note", "ProductNote", "Product" IN SHARE ROW EXCLUSIVE MODE',
        );
      const notes = await tx.note.findMany({ orderBy: { id: 'asc' } });
      const links = await tx.productNote.findMany({ orderBy: { id: 'asc' } });
      const products = await tx.product.findMany({ select: { id: true, status: true } });
      const activeIds = new Set(
        products.filter((row) => row.status === 'active').map((row) => row.id),
      );
      const plan = planNoteMerge(notes, links);
      const affectedNotes = notes.filter((note) => plan.affectedIds.includes(note.id));
      const noteHash = hash(affectedNotes);
      if (rollbackIndex >= 0) {
        const auditFile = args[rollbackIndex + 1];
        if (!auditFile) throw new Error('Missing rollback audit path');
        const audit = auditSchema.parse(JSON.parse(await readFile(auditFile, 'utf8')) as unknown);
        if (
          audit.target !== target ||
          audit.noteHash !== noteHash ||
          JSON.stringify(audit.affectedIds) !== JSON.stringify(plan.affectedIds)
        )
          throw new Error('Rollback target or Note metadata changed');
        if (rollbackNoteMergeState(plan.before, audit.before, audit.after) === 'already-restored') {
          console.log(JSON.stringify({ target, rollback: 'already restored' }));
          return;
        }
        await tx.productNote.deleteMany({ where: { noteId: { in: audit.affectedIds } } });
        if (audit.before.length) await tx.productNote.createMany({ data: audit.before });
        const restored = await tx.productNote.findMany({
          where: { noteId: { in: audit.affectedIds } },
          orderBy: { id: 'asc' },
        });
        if (!equalLinks(restored, audit.before)) throw new Error('Rollback verification failed');
        console.log(JSON.stringify({ target, rollback: 'restored', rows: restored.length }));
        return;
      }
      const afterById = new Map(plan.after.map((row) => [row.id, row]));
      const deletedIds = plan.before.filter((row) => !afterById.has(row.id)).map((row) => row.id);
      const changed = plan.before.filter((row) => {
        const after = afterById.get(row.id);
        return after && (after.noteId !== row.noteId || after.position !== row.position);
      });
      const activeSets = (rows: NoteLink[]) =>
        Object.fromEntries(
          [...new Set(rows.map((row) => row.noteId))]
            .sort((a, b) => a - b)
            .map((id) => [
              id,
              [
                ...new Set(
                  rows
                    .filter((row) => row.noteId === id && activeIds.has(row.productId))
                    .map((row) => row.productId),
                ),
              ].sort((a, b) => a - b),
            ]),
        );
      const audit = {
        target,
        mode: apply ? 'apply' : 'dry-run',
        noteHash,
        notes: affectedNotes,
        ...plan,
        deletedIds,
        changedIds: changed.map((row) => row.id),
        activeProductSetsBefore: activeSets(plan.before),
        activeProductSetsAfter: activeSets(plan.after),
        inactiveLinksBefore: plan.before.filter((row) => !activeIds.has(row.productId)).length,
        inactiveLinksAfter: plan.after.filter((row) => !activeIds.has(row.productId)).length,
      };
      const reportFile = path.join(
        reportDirectory,
        `${new Date().toISOString().replaceAll(':', '-')}-${audit.mode}.json`,
      );
      // Backup exists before the first write; transaction aborts if backup cannot be saved.
      await writeFile(reportFile, JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
      if (apply && (deletedIds.length || changed.length)) {
        if (deletedIds.length)
          await tx.productNote.deleteMany({ where: { id: { in: deletedIds } } });
        for (const row of changed)
          await tx.productNote.update({
            where: { id: row.id },
            data: {
              noteId: afterById.get(row.id)!.noteId,
              position: afterById.get(row.id)!.position,
            },
          });
      }
      if (apply) {
        const actual = await tx.productNote.findMany({ orderBy: { id: 'asc' } });
        const affected = actual.filter((row) => plan.affectedIds.includes(row.noteId));
        if (
          !equalLinks(affected, plan.after) ||
          hash(activeSets(affected)) !== hash(activeSets(plan.after))
        )
          throw new Error('Canonical membership/layer/position/active-set verification failed');
        if (
          !equalLinks(
            actual.filter((row) => !plan.affectedIds.includes(row.noteId)),
            links.filter((row) => !plan.affectedIds.includes(row.noteId)),
          )
        )
          throw new Error('Unrelated memberships changed');
        if (hash(await tx.note.findMany({ orderBy: { id: 'asc' } })) !== hash(notes))
          throw new Error('Note metadata changed');
      }
      console.log(
        JSON.stringify({
          target,
          mode: audit.mode,
          affectedNotes: affectedNotes.length,
          linksBefore: plan.before.length,
          linksAfter: plan.after.length,
          transferred: changed.length,
          redundantDeleted: deletedIds.length,
          inactiveBefore: audit.inactiveLinksBefore,
          inactiveAfter: audit.inactiveLinksAfter,
          reportFile,
        }),
      );
    },
    { timeout: 120000, isolationLevel: 'Serializable' },
  );
}
main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Migration failed');
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
