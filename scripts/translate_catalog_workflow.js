/**
 * Catalog translation workflow: EN → ru + uz
 *
 * Redesigned to avoid large StructuredOutput payloads:
 *   - Load:      docker cp + count → returns {success, total} only
 *   - Translate: each agent reads its slice, translates, writes /tmp/tr_chunk_N.json
 *                then returns tiny {success, chunk_idx, count}
 *   - Merge:     one agent merges all chunk files into the final JSON and copies to container
 *
 * Input:  /tmp/catalog_strings_en.json   (from rake labor:translations:export)
 * Output: /tmp/catalog_strings_translated.json  (for rake labor:translations:import)
 *
 * Run via Claude Code workflow:
 *   Workflow({ scriptPath: "scripts/translate_catalog_workflow.js" })
 *
 * Model routing (per global model-routing.md):
 *   Export order: 354 products, 44 brands, 317 notes, 64 accords (= 779 total)
 *   Chunks 0-19  (rows 0-399):   product descriptions + brand prose → sonnet
 *   Chunks 20+   (rows 400-778): note names + accord names (short) → haiku
 */

export const meta = {
  name: 'translate-catalog',
  description: 'Translate Labor catalog strings from EN to ru and uz using LLM fan-out',
  phases: [
    { title: 'Load',      detail: 'Copy export file from container to host and count strings' },
    { title: 'Translate', detail: 'Fan-out translation agents (sonnet for prose, haiku for names)' },
    { title: 'Merge',     detail: 'Consolidate chunk files and copy translated JSON into container' },
  ],
};

const CHUNK_SIZE = 20;

// ─── Phase 1: Load ─────────────────────────────────────────────────────────────
// Just copy the file and return the string count — NOT the array itself.
// Returning 779 items via StructuredOutput exceeds the agent's output capacity.
phase('Load');

const loadResult = await agent(
  `Run these two commands in order and return the result:

1. docker cp labor-backend-1:/tmp/catalog_strings_en.json /tmp/catalog_strings_en.json

2. python3 -c "import json; print(len(json.load(open('/tmp/catalog_strings_en.json'))))"

Return {"success": true, "total": <the integer printed by command 2>} if both succeed.
Return {"success": false, "total": 0} if any step fails.`,
  {
    label: 'load-input',
    schema: {
      type: 'object',
      required: ['success', 'total'],
      properties: {
        success: { type: 'boolean' },
        total:   { type: 'number' },
      },
    },
  },
);

if (!loadResult.success || loadResult.total === 0) {
  log('ERROR: Failed to load catalog strings. Run rake labor:translations:export first.');
  return { error: true };
}

const total = loadResult.total;
const numChunks = Math.ceil(total / CHUNK_SIZE);
log(`Loaded ${total} strings → ${numChunks} chunks of ≤${CHUNK_SIZE}.`);

// ─── Phase 2: Translate ────────────────────────────────────────────────────────
// Each agent reads its own slice from disk, translates EN → ru + uz,
// writes the result to /tmp/tr_chunk_<idx>.json, then returns {success, chunk_idx, count}.
// No large arrays go through StructuredOutput — each chunk is at most 20 items.
//
// Model routing by chunk index:
//   Chunks  0-19: product descriptions (354) + brand prose (44) → sonnet
//   Chunks 20+:   note names (317) + accord names (64)          → haiku
phase('Translate');

const chunkIndices = Array.from({ length: numChunks }, (_, i) => i);

const chunkResults = await pipeline(
  chunkIndices,
  async (chunkIdx) => {
    const start = chunkIdx * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, total);
    const count = end - start;
    const model = chunkIdx >= 20 ? 'claude-haiku-4-5' : 'claude-sonnet-4-6';

    return await agent(
      `You are a professional translator for a luxury fragrance e-commerce brand in Uzbekistan.

STEP 1 — Read the source data for this chunk. Run:
python3 -c "import json; data=json.load(open('/tmp/catalog_strings_en.json')); print(json.dumps(data[${start}:${end}], ensure_ascii=False))"

This prints a JSON array of ${count} objects. Each object has: model, id, field, en (the text to translate).

STEP 2 — Translate each item's "en" field to Russian and Uzbek Latin.

Translation rules:
- DO NOT translate brand names, perfume names, or proper nouns (e.g. "Xerjoff", "Chanel", "Erba Pura", "Alberto Morillas", "Giorgio Armani").
- DO NOT translate specific fragrance ingredient names (e.g. "ISO E Super", "Ambroxan", "Hedione", "Iso E Super").
- Note names and accord names: short, natural-sounding. Use standard Russian/Uzbek fragrance vocabulary.
- Product descriptions and brand stories: preserve tone, elegance, style. Full sentences.
- ru: formal literary Russian, suitable for luxury retail. No English words leftover.
- uz: Uzbek Latin script — NOT Cyrillic. Modern, natural Uzbek phrasing.
- If the "en" field is empty or null, return empty strings for ru and uz.

STEP 3 — Write the translated results to disk using this Python heredoc:

python3 << 'PYEOF'
import json

data = [
  # paste each translated item here as a Python dict, one per line:
  # {"model": "...", "id": 123, "field": "...", "en": "...", "ru": "...", "uz": "..."},
]

with open('/tmp/tr_chunk_${chunkIdx}.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print(f"chunk_${chunkIdx}: wrote {len(data)} items")
PYEOF

STEP 4 — Return: {"success": true, "chunk_idx": ${chunkIdx}, "count": <actual items written>}
If writing failed, return {"success": false, "chunk_idx": ${chunkIdx}, "count": 0}.`,
      {
        label: `translate-${chunkIdx}`,
        model,
        phase: 'Translate',
        schema: {
          type: 'object',
          required: ['success', 'chunk_idx', 'count'],
          properties: {
            success:   { type: 'boolean' },
            chunk_idx: { type: 'number' },
            count:     { type: 'number' },
          },
        },
      },
    );
  },
);

const successful = chunkResults.filter(Boolean).filter((r) => r && r.success);
const totalWritten = successful.reduce((s, r) => s + (r.count || 0), 0);
log(`${successful.length}/${numChunks} chunks translated — ${totalWritten} items written to chunk files.`);

if (successful.length === 0) {
  log('ERROR: No chunks translated. Check agent outputs.');
  return { error: true };
}

// ─── Phase 3: Merge ────────────────────────────────────────────────────────────
// Read all /tmp/tr_chunk_*.json files, merge into one array, copy to container.
phase('Merge');

const mergeResult = await agent(
  `Merge all translation chunk files into one output, then copy it into the Docker container.

STEP 1 — Merge and write merged file (run this Python script):
python3 << 'PYEOF'
import json, os

rows = []
missing = []
for i in range(${numChunks}):
    path = f'/tmp/tr_chunk_{i}.json'
    if os.path.exists(path):
        with open(path, encoding='utf-8') as f:
            chunk = json.load(f)
        if isinstance(chunk, list):
            rows.extend(chunk)
    else:
        missing.append(i)

if missing:
    print(f"WARNING: missing chunk files: {missing}")

with open('/tmp/catalog_strings_translated.json', 'w', encoding='utf-8') as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

size = os.path.getsize('/tmp/catalog_strings_translated.json')
print(f"Merged {len(rows)} items, {size} bytes")
PYEOF

STEP 2 — Copy into Docker container:
docker cp /tmp/catalog_strings_translated.json labor-backend-1:/tmp/catalog_strings_translated.json

STEP 3 — Return {"success": true, "total": <merged item count>, "bytes": <file size in bytes>}`,
  {
    label: 'merge-output',
    phase: 'Merge',
    schema: {
      type: 'object',
      required: ['success', 'total', 'bytes'],
      properties: {
        success: { type: 'boolean' },
        total:   { type: 'number' },
        bytes:   { type: 'number' },
      },
    },
  },
);

log(`Merge complete: ${mergeResult.total} items, ${mergeResult.bytes} bytes. Container copy done.`);

return {
  total_input:  total,
  total_output: mergeResult.total,
  bytes:        mergeResult.bytes,
};
