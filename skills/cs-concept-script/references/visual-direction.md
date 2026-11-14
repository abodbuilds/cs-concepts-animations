# Visual direction — Logic Workshop

The user has specified attractive, distinctive opening animation; a runtime below three minutes; and a problem/showcase → theory → pseudocode/application structure. The audience is beginner programmers and the primary format is vertical 9:16. Logic Workshop is the settled style, Alexandria is the chosen font, and narration uses simple Egyptian Arabic with English technical terms.

## Selected: Logic Workshop

A small, carefully constructed world of physical computation. Think matte ceramic modules, machined tracks, printed numeric labels, and a warm studio floor. Use material, composition, and meaningful motion to establish the identity.

Signature transition: the model unfolds into its own diagram. Objects retain their labels and positions relative to the computation while depth collapses, the camera settles, and connectors or bounds appear. In the last section, code becomes the controller of those same objects.

### Established art direction

- Palette: dark theme with deep purple background `#2D123F` and yellow text `#F4D35E`. Use related dark plum surfaces for objects, code panels, and captions, with muted lavender for secondary labels. This is the flipped version of the earlier yellow background theme and is the current default.
- Roles: plum objects are available data; yellow marks the current operation; warm gold with a check/result label marks success. Use deep purple labels on yellow or gold surfaces, including active objects and highlighted target tokens. Keep eliminated possibilities faintly visible and preserve readable code highlights on the dark panels.
- Branding: show `@abodbuilds` at the top right. Logic Workshop remains the internal style name, not the on-screen channel label.
- Episode identity: show the episode number, theme, and concept together at the top left, for example `02 / ALGORITHMS / INSERT SORT`. Keep this line readable and separate from the top-right brand; use the concept label requested for the episode.
- Materials: matte surfaces and soft contact shadows; a small amount of translucent material only when it reveals useful internal state.
- Type: Alexandria for Arabic and English headings, narration captions, diagram labels, and standalone values. Start with weight 600 for headlines, 500 for emphasis, and 400 for supporting text. Keep pseudocode and aligned code traces in a readable monospace. Test at intended viewing size rather than relying on a fixed pixel-size rule.
- Composition: design directly in vertical 9:16, with one focal mechanism, generous breathing room, one short headline, and a deliberately placed target or goal. Recompose wide diagrams into a readable vertical arrangement while preserving their logical relationships.
- Camera: an opening three-quarter view reveals depth. Move toward a stable, flat view for the explanation. Code traces hold the camera still so state changes remain easy to follow.
- Motion: anticipation → operation → consequence → reading hold. Prefer cuts and motivated transforms over constant camera motion. Treat 0.3–0.8 second operation transitions and 0.5–1.5 second holds as starting points, adjusted to comprehension.
- Sound: restrained tactile clicks for discrete operations, a short texture for a large structural transformation, and a quiet resolution cue. Never make sound the only signal of a state change.

Distinctiveness should come from repeatable behavior: every episode begins with a miniature problem-world, reveals its logic by unfolding it, and ends with code operating it. Do not claim the aesthetic is globally unique or imitate a specific creator's identity.

## Vertical composition

- Use a 1080 × 1920 working canvas by default. The aspect ratio is the user's preference; the resolution is an implementation default.
- Keep the opening mechanism large and central. During theory and application, use the upper and middle areas for the diagram and place the relevant code excerpt below it. Reserve a separate area for captions, away from essential objects and code.
- Keep essential content comfortably inside the frame. When a destination platform is specified, account for its interface overlays in the final composition.
- Prefer a few large objects and progressive disclosure. Break dense diagrams into successive shots or explicitly connected groups; do not squeeze a landscape scene into the vertical frame.
- Keep English code left-aligned and LTR, with roughly 3–6 visible lines per beat. Split long statements across readable steps without changing their semantics. Use highlighting to connect the active line with the changed diagram state.
- Keep narration captions to one or two readable lines at a time. Re-time or split long captions instead of covering more of the diagram. Place essential diagram labels near their objects, separate from captions.
- Inspect a phone-sized version of the 9:16 frame when rendering. The earlier responsive browser studies explore style and motion; they are not final vertical video compositions.

## Arabic composition

- Use simple Egyptian Arabic and a right-to-left composition for headings, captions, and section progression. Keep technical names in English. Read [voice and terminology](voice-and-terminology.md) for the spoken style and examples.
- Use Alexandria with proper Arabic shaping, comfortable line height, and no added tracking between connected letters. Let text reflow instead of shrinking it to fit an English layout.
- Keep pseudocode, variable names, indices, and mathematical comparisons explicitly left-to-right. Isolate those runs inside Arabic text. Do not reverse operators or mirror array order simply because the surrounding layout is RTL.
- The prototype uses the digits 0–9 consistently in data, code, and captions to keep the trace easy to follow. This is a design choice that can change with the user's numeral preference.
- Isolate embedded English terms such as `Binary Search`, `Array`, `Code`, and `index` as LTR runs. Use `bdi` or equivalent direction isolation in rich text and Unicode isolates in canvas text. Keep punctuation outside the isolated term unless it belongs to a formula.
- Reassess timing using the actual Egyptian Arabic narration, including English terms. Do not carry over an English or Modern Standard Arabic word budget without checking delivery and reading time.
- The Arabic motion study is `style-study/logic-workshop-ar.html` in the project. It includes timed sample narration captions and no recorded voiceover.

## Font asset

The reusable variable font is [Alexandria-Variable.ttf](../assets/fonts/Alexandria-Variable.ttf), bundled with its [OFL license](../assets/fonts/OFL.txt) from the [Google Fonts Alexandria source](https://github.com/google/fonts/tree/main/ofl/alexandria). Load this asset in the chosen renderer; avoid silently substituting a system font in final output. For browser canvas, wait for the font to load before starting or capturing the animation. For other renderers, verify Arabic shaping as well as the font family.

## Previously explored alternatives

**Signal Room:** smoked dark surfaces, mint traces, amber results, orbital arrangements, scanning and instrument-like motion. The opening feels like inspecting an invisible system. Prefer this if the user wants a technical, cinematic atmosphere.

**Paper Machines:** cream stock, graphite ink, vermilion operations, olive results, printed cards, cut-paper masks, and deliberate stepped motion. The opening feels like assembling an idea on a drafting table. Prefer this if the user wants a warm, editorial character.

These directions differ in spatial arrangement, material, and motion—not only palette. The initial browser motion study illustrates the difference but does not reproduce final Blender materials or production sound.

## Renderer selection

Choose tools after the shot requirements are clear, and verify their actual availability before implementation. Candidate production split: Blender for tactile opening shots, Manim for precise explanatory diagrams, Three.js for procedural or interactive scenes, and HyperFrames for composition if its available workflow fits. These are options, not a requirement to combine four stacks.

Prefer a single tool when it can maintain the visual quality and object continuity. A multi-tool production needs matched camera framing, palette, type, object identifiers, and timing across exports.
