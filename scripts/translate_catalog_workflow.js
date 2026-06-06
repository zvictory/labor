/**
 * Catalog translation workflow: EN → ru + uz
 *
 * Input:  /tmp/catalog_strings_en.json   (from rake labor:translations:export)
 * Output: /tmp/catalog_strings_translated.json  (for rake labor:translations:import)
 *
 * Run via Claude Code workflow:
 *   Workflow({ scriptPath: "scripts/translate_catalog_workflow.js" })
 *
 * Model routing (per global model-routing.md):
 *   - Short strings (accord names, note names — typically 1-5 words): haiku
 *   - Prose (descriptions, bios, stories — full paragraphs): sonnet
 */

export const meta = {
  name: 'translate-catalog',
  description: 'Translate Labor catalog strings from EN to ru and uz using LLM fan-out',
  phases: [
    { title: 'Load', detail: 'Read exported strings from disk' },
    { title: 'Translate', detail: 'Fan-out translation agents (haiku for names, sonnet for prose)' },
    { title: 'Save', detail: 'Write translated strings to /tmp/catalog_strings_translated.json' },
  ],
};

// ─── Schema ────────────────────────────────────────────────────────────────────
const TRANSLATION_SCHEMA = {
  type: 'object',
  required: ['ru', 'uz'],
  properties: {
    ru: { type: 'string', description: 'Russian translation of the EN text' },
    uz: { type: 'string', description: 'Uzbek (Latin script) translation of the EN text' },
  },
};

// ─── Load input ────────────────────────────────────────────────────────────────
// The export rake writes to /tmp inside the container. Copy it out first,
// then read from the host /tmp path.
phase('Load');
const rows = await agent(
  `Do the following steps in order:
  1. Run: docker cp labor-backend-1:/tmp/catalog_strings_en.json /tmp/catalog_strings_en.json
     (this copies the file from the Docker container to the host filesystem)
  2. Read the file /tmp/catalog_strings_en.json on the host.
  3. Parse the JSON and return the array.

  If the file does not exist or the docker cp fails, return an empty array [].`,
  {
    label: 'load-input',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['model', 'id', 'field', 'en'],
        properties: {
          model:    { type: 'string' },
          id:       { type: 'number' },
          field:    { type: 'string' },
          en:       { type: 'string' },
          needs_ru: { type: 'boolean' },
          needs_uz: { type: 'boolean' },
        },
      },
    },
  },
);

if (!rows || rows.length === 0) {
  log('No strings to translate. Run rake labor:translations:export first.');
  return { translated: [] };
}

log(`Loaded ${rows.length} strings to translate.`);

// ─── Fan-out translation ────────────────────────────────────────────────────────
phase('Translate');

// Split into chunks of ≤20 rows for efficient batching.
// Short strings (accord/note names) → haiku; prose → sonnet.
const isShort = (row) =>
  (row.model === 'accord' && row.field === 'name') ||
  (row.model === 'note' && row.field === 'name');

const CHUNK_SIZE = 20;
const chunks = [];
for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
  chunks.push(rows.slice(i, i + CHUNK_SIZE));
}

log(`Processing ${rows.length} strings in ${chunks.length} chunks.`);

const translated = await pipeline(
  chunks,
  async (chunk) => {
    // Use haiku if ALL rows in the chunk are short strings, sonnet otherwise.
    const allShort = chunk.every(isShort);
    const model = allShort ? 'claude-haiku-4-5' : 'claude-sonnet-4-6';

    const prompt = `You are a professional translator for a luxury fragrance e-commerce brand.
Translate the following English catalog texts to Russian (ru) and Uzbek Latin (uz).

Rules:
- DO NOT translate brand names, perfume names, or people's names (e.g. "Xerjoff", "Chanel", "Erba Pura", "Alberto Morillas").
- DO NOT translate chemical compound names or fragrance ingredient names in technical contexts.
- For note and accord names: short, natural-sounding translations. Use standard Russian/Uzbek fragrance vocabulary.
- For product descriptions, brand stories, and perfumer bios: preserve the tone, elegance, and fragrance terminology.
- Uzbek script: use Latin script (not Cyrillic). The store uses Uzbek Latin.
- ru: formal literary Russian, suitable for luxury retail.
- uz: modern Uzbek Latin, readable and natural for Uzbek customers.

Texts to translate (${chunk.length} items):
${chunk.map((r, i) => `${i + 1}. [${r.model}.${r.field}] ${r.en}`).join('\n\n')}

Return a JSON array of exactly ${chunk.length} objects, one per text in the same order:
[{ "ru": "...", "uz": "..." }, ...]`;

    const results = await agent(prompt, {
      label: `translate-chunk-${allShort ? 'haiku' : 'sonnet'}`,
      model,
      phase: 'Translate',
      schema: {
        type: 'array',
        items: TRANSLATION_SCHEMA,
        minItems: chunk.length,
        maxItems: chunk.length,
      },
    });

    if (!results || results.length !== chunk.length) {
      log(`WARNING: chunk returned ${results?.length ?? 0} items, expected ${chunk.length}`);
      return chunk.map((r) => ({ ...r, ru: '', uz: '' }));
    }

    return chunk.map((row, i) => ({
      model:    row.model,
      id:       row.id,
      field:    row.field,
      en:       row.en,
      ru:       results[i].ru || '',
      uz:       results[i].uz || '',
    }));
  },
);

const flat = translated.filter(Boolean).flat();
log(`Translated ${flat.length} strings.`);

// ─── Save output ───────────────────────────────────────────────────────────────
// Write to host /tmp, then copy INTO the container so the import rake can read it.
phase('Save');
const saved = await agent(
  `Do the following steps:
  1. Write the JSON array below to /tmp/catalog_strings_translated.json on the host filesystem.
     Use 2-space indentation. Overwrite if the file exists.
  2. Run: docker cp /tmp/catalog_strings_translated.json labor-backend-1:/tmp/catalog_strings_translated.json
     (this copies the file from the host into the Docker container)
  3. Confirm both steps succeeded and return the file size in bytes.

  JSON to write:
  ${JSON.stringify(flat)}`,
  {
    label: 'save-output',
    schema: {
      type: 'object',
      required: ['success', 'bytes'],
      properties: {
        success: { type: 'boolean' },
        bytes:   { type: 'number' },
      },
    },
  },
);

log(`Saved to /tmp/catalog_strings_translated.json (${saved.bytes} bytes).`);

return {
  total_input:    rows.length,
  total_output:   flat.length,
  output_path:    '/tmp/catalog_strings_translated.json',
  bytes:          saved.bytes,
};
