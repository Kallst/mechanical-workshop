# Visual bilingual operations cockpit

Issue: #17. Owner-authorized change to the original English-only UI rule.

## Interaction and scope

The visual hierarchy uses a graphite canvas, matte layered panels, orange actions and selection, and muted green for confirmed useful activity. Four primary navigation groups replace the original flat menu. Secondary tabs follow the active group and the signed-in role. Authentication, database transactions and domain commands remain server-enforced.

The overview is an interactive native SVG workshop, with distinctive truck, bus and excavator illustrations, stock pictograms, real recorded cost proportions, pending requests and technician activity. The first three service orders appear on the floor, including the baseline historical order; the full register remains accessible. These positions are illustrative, not measured physical locations. Orange indicates selection, not a fabricated operational state. Technician views receive the same server-redacted data as before; no financial data is inferred by the visual layer. Equipment strips show recorded interval durations, with unknown data distinguished from working, idle and off.

Spanish is the default presentation language. ES / EN persists in browser local storage. Navigation, dialogs, seeded descriptions, feedback, statuses, dates, amounts and printable invoices follow the chosen language. UI CSV links include `lang=es` or `lang=en`; existing API consumers retain English by default. IDs, proper names and user-written content remain unchanged. Database enums and command payloads remain English.

Histories and detailed Systems Theory explanations can be expanded. Critical disclosures about simulation, estimated energy, unknown observation coverage and educational invoices remain visible. Keyboard focus, map selection, dialog labels, responsive layouts, reduced motion and print styles are included.

## Asset provenance

`public/art/workshop-hero.webp` is an AI-generated fictional login illustration, optimized to WebP (290,268 bytes). It depicts no real person, real customer or measured workshop. It is decorative; operational controls and data remain editable HTML/SVG. The workshop floor, vehicle/material/equipment graphics and icons are native SVG code.

Method: built-in image generation tool, new raster generation, opaque background. Original generated PNG retained outside the repository in the session image output. Production asset: `public/art/workshop-hero.webp`.

Final prompt:

> Use case: stylized-concept. Asset type: premium web application login hero background, no interface, no words. Create an exceptionally polished cinematic 3D isometric cutaway heavy-vehicle mechanical maintenance workshop at night, architectural miniature with realistic PBR materials. Graphite black industrial floor, orange safety strips and amber practical lighting, a dark orange heavy-duty semi truck being serviced, an off-white industrial bus, a small yellow excavator, blue-gray compressor and neatly organized oil drums and parts shelves. Beautiful detailed tools, overhead structural beams at the back, technicians represented subtly, realistic proportions. Composition: wide 3:2 image, complete miniature workshop occupies center and right; left area clean deep charcoal negative space fading into scene for separate editable UI copy, no in-image labels. Refined professional industrial fleet maintenance aesthetic, matte metal, warm accent lights, crisp modeling, high contrast but visible silhouettes, sophisticated not cartoon, not cyberpunk, no neon, no floating HUD, no logos, no text. This is illustrative fictional scenery for a Systems Theory workshop simulation, not real telemetry.

## Startup compatibility

During verification, an existing database exposed raw migration checksums differing only by Windows CRLF / Unix LF checkout. Migration verification now accepts both byte representations of the same SQL and writes the canonical LF digest for new migrations. Altered SQL still fails verification. No migration content, applied database record or user data is overwritten. Windows static export concurrency is limited to one worker. Windows production builds also include a narrowly scoped retry for transient recursive-directory EPERM / EACCES errors inside `.next`, inherited by Next export workers. Retries are bounded; persistent permission errors and all other paths still fail. Linux builds are unchanged.

## Verification

Verification results and release evidence are recorded in the release notes after execution. This is a solo implementation and self-review; no independent reviewer or real-world operational validation is claimed.
