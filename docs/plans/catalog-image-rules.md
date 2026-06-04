# Catalog Image Rules

Labor shop cards use a 3:4 product frame. Product images should be harvested or produced for that frame, not merely accepted because they render.

## Size Standard

- Preferred master: `750×1000` px.
- Minimum suitable source: `600×800` px.
- Target ratio: `3:4` (`0.75` width/height).
- Image content: centered bottle, clean/light or transparent background, no text overlay, no people.

## Suitability

An image is `not_suitable` when:

- it is missing;
- width is below `600` px or height is below `800` px;
- its aspect ratio is far from `3:4`.

Fragrantica CDN `375×500` images are allowed only as temporary fallback references. They should be queued for replacement before treating a product as shop-ready.

## Harvest Policy

- Do not bypass anti-bot systems, rotate IPs, solve CAPTCHAs, or evade source blocking.
- If polite access is blocked, stop and use an approved/manual source.
- Store expressive source copy separately from catalog copy; product imagery rules do not relax copy-rewrite requirements.

## Generated Queues

- Run `scripts/audit_fragrantica_state.rb` to write `/tmp/fragrantica_audit.json`.
- Run `scripts/build_harvest_targets.rb` to write `/tmp/harvest_image_updates.jsonl`.
- Rows in `/tmp/harvest_image_updates.jsonl` are the source of truth for products whose image is missing or below the shop standard.
