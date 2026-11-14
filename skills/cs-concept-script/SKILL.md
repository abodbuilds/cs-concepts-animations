---
name: cs-concept-script
description: Write scripts and animation storyboards for vertical computer-science explainer videos under three minutes for beginner programmers, moving from a motivating problem or showcase to theory and then pseudocode or practical application.
---

# CS concept script

Write a production-ready narration and animation plan for one computer-science concept. The video must be shorter than 180 seconds and follow this order: motivating problem/showcase → theoretical explanation → pseudocode/application with diagrams and animation.

## Establish the episode

The established audience is beginner programmers who understand variables, conditions, and loops. Explain new CS concepts from scratch; do not assume prior knowledge of the episode's algorithm, data structure, or complexity notation. The primary format is vertical 9:16 for TikTok/Reels, composed for phone viewing from the start; use 1080 × 1920 as the working canvas unless another resolution is requested. Honor explicit episode-specific overrides.

The established language preference is simple conversational Egyptian Arabic, with technical terms kept in English. Read [voice and terminology](references/voice-and-terminology.md) before writing narration. Introduce an unfamiliar technical term with a short plain-language explanation when it first matters to the example.

When working from supplied voiceover, follow the supplied-recording rules in that reference: keep the recording fixed and adapt graphics to its acoustic timing. Audio processing is not part of a graphics revision unless explicitly requested.

Choose one learning outcome, one motivating question, and one example that survives all three sections. Cut secondary concepts or propose a separate episode if the explanation does not fit. For abstract topics, define the relevant model and what the physical metaphor does and does not represent.

Read [the visual direction](references/visual-direction.md) when deciding shots and motion. The user selected Logic Workshop, a dark purple background with yellow text, and Alexandria typography. Preserve these choices unless they request a change, and follow the mixed Arabic/English composition guidance in that reference.

## Structure and pacing

Aim for 150–170 seconds; a useful starting layout is:

| Section | Time | Required result |
| --- | --- | --- |
| Problem/showcase | 0:00–0:35 | A compelling animation begins immediately; the viewer sees a concrete goal, failure, cost, or surprising result that makes the concept necessary. |
| Theory | 0:35–1:30 | Transform the opening objects into a diagram. Explain the core mechanism, required conditions, and why it works. |
| Pseudocode/application | 1:30–2:40 | Execute the idea on the same example, coupling code or operations to diagram changes. Finish by resolving the opening problem and naming the important limitation. |

Adjust the section durations to the concept. Keep their order and remain strictly below 180 seconds. Integrate the payoff into the final section rather than adding a separate outro. Avoid logo stings, greetings, channel introductions, and promises of what will be covered before the problem appears.

Make the first spoken sentence a concrete challenge, surprising constraint, or useful result tied to the visible example. Put the target and stakes on screen immediately; land the question within the opening few seconds. Prefer “خمستاشر رقم… تقدر تلاقي الواحد وسبعين بأربع خطوات بسّ؟” over a generic “شايف الأرقام دي؟”. The episode must demonstrate and resolve its opening promise. Keep numerical claims specific to the example, and avoid unsupported speed claims or clickbait. Connect the hook naturally to the baseline attempt and then the reason to learn the concept.

Budget narration using an explicit estimated delivery rate appropriate to the Egyptian Arabic delivery and its English terminology. Reserve real time for code reading, consequential motion, and silent holds. For an initial estimate, subtract 15–25 seconds of holds from a 160-second target, then calculate the spoken-word budget at the stated rate. Read the mixed-language script aloud or use recorded narration to refine timing; written word count alone is not runtime validation. Cut content instead of rushing unfamiliar English terms.

## Write for causal animation

- Specify what exists on screen at the first frame and what meaningful action happens within the opening seconds. The opening animation must show the problem, not just decorate its title.
- Keep object identity, values, labels, and semantic colors consistent from the opening through theory and code. Plan the transition explicitly: physical scene → diagram → executable diagram.
- Make each key operation observable: compare, split, queue, route, lock, allocate, discard, or return. Animate the consequence after its cause; hold the result long enough to read.
- Align code highlights to actual execution. Highlight a condition during evaluation, then the selected operation while its state change occurs. Let diagrams show what prose would otherwise repeat.
- Use descriptive, speakable pseudocode names and narrate each operation's meaning in a complete Egyptian Arabic sentence. Follow the concrete examples in [voice and terminology](references/voice-and-terminology.md).
- Narration carries the reasoning: declare the state, then explain the exact operation and its consequence. Keep full numeric sequences in the diagram instead of reciting them; see the spoken-style guidance for when a particular value is useful to say. On-screen text supplies labels, a short claim, or the relevant code; avoid making viewers read a duplicate paragraph.
- Compose for a vertical frame: keep one dominant animation or diagram, with the current code excerpt below it and a separate caption area. Reveal detail in successive shots when the diagram and code cannot both stay readable on a phone.
- Use only a few visible pseudocode lines at a time, usually 3–6. Reveal further lines in steps rather than shrinking the type. Include initialization, termination, and failure behavior in the complete pseudocode when applicable.
- Describe an essential invariant or condition in plain language. State complexity only with its assumptions and cost model; distinguish illustrative examples from measured benchmarks.

## Deliver the script

Provide a short episode brief (learning outcome, beginner prerequisites, language, vertical frame size, opening question, estimated runtime), followed by a timecoded shot table:

| Time | Exact narration | Visual state and action | On-screen text / code | Transition / sound cue |
| --- | --- | --- | --- | --- |

Use contiguous time intervals. Include silent holds explicitly. Specify concrete objects, values, comparisons, camera changes, and final states so an animator can implement the shots. Sound cues are optional; the lesson must work without them.

After the table, provide complete pseudocode or application steps, a compact state trace for the worked example, and a production note explaining the proposed renderer and any needed assets. Choose among the user's available tools—Blender, Manim, HyperFrames, Three.js, or others—according to the shots and installed capabilities. A single renderer is acceptable. Do not assume that writing a script requires installing or running every tool.

Only generate animation code or render a finished video when that is part of the requested scope. A script request ordinarily delivers narration and an implementable storyboard.

## Validate before delivery

Check that the opening justifies the concept, all three sections are present, and the final application answers the opening question. Trace the example against the pseudocode; reconcile every displayed value, pointer, state, and complexity claim. Read adjacent narration beats as continuous speech: check the hook, natural Egyptian transitions, definite articles for known objects/numbers, and idiomatic phrasing rather than literal English translations. Check that unfamiliar concepts are introduced for beginners, English technical terms remain consistent, and the visual plan specifies Alexandria. Check the 9:16 composition for readable code, labels, and captions at phone size. Check voiceover word count, reading holds, and shot durations against a total below 180 seconds. Distinguish estimated timing from timing verified against recorded audio.

Read [the binary-search example](references/binary-search-example.md) only when a concrete treatment or algorithm trace helps. Its visual study compresses the narrative into 22 seconds; it is not a finished episode or a substitute for the timing budget.
