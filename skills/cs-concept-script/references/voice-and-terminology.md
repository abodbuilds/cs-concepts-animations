# Voice and terminology

The user's settled preference: simple conversational Egyptian Arabic for speech, with technical terms kept in English. Use this for narration and its captions unless the user explicitly requests another language or dialect for an episode.

## Speech generation

When producing narration, use ElevenLabs v4 (`eleven_v4`), as requested by the user. Use selective, pronunciation-driven tashkeel: a useful shadda or vowel on an ambiguous word, rather than fully marking every word. The user found the heavily vowelled opening unnatural. Start from natural Egyptian wording and use short sentences and punctuation to guide delivery. Do not add formal case endings or force an MSA vowel pattern onto colloquial speech. Keep technical terms and identifiers in English. Deliver the synthesis text with its selective marks and check the generated opening and code explanation. Captions can omit vowel marks.

## Supplied voiceover

When the user supplies a finished recording, treat it as the fixed timeline. Rebuild shot lengths, action timing, code highlights, and reading holds around that audio. Do not modify its speed, pitch, pauses, gain, or sample rate to accommodate graphics. Do not apply loudness normalization or other audio processing unless requested. Preserve supplied line boundaries; derive word anchors acoustically rather than dividing a line duration. Analysis-only slowed copies must never become export inputs.

Render graphics independently and attach the original recording at time zero. For a source-faithful master, use a container/codec that preserves the original samples and verify the decoded audio hash and sample count against the supplied file. If a separate viewing copy requires lossy encoding, describe that distinction and do not claim that its samples are identical. Keep the supplied source hash in the production metadata so subsequent builds cannot silently switch to a processed intermediate.

## Spoken style

- Sound like a clear Egyptian instructor talking to one person. Prefer short, direct sentences: “بص”، “خلّينا”، “عايزين”، “كده”، “بدل ما”، “كل مرة”. Use these when natural, not as a repeated catchphrase.
- Use familiar Egyptian wording such as “هنجرّب”، “نصّها”، “اللي عالشمال”، “لقيناه”. Avoid formal narration such as “سوف نفحص”، “نستطيع”، or “إذًا” when a simpler spoken equivalent fits.
- Keep the reasoning precise and the tone calm. Avoid exaggerated slang, forced jokes, and filler that consumes the runtime.
- The user prefers state descriptions and concrete operations over rehearsing numbers. Do not read out an array at the opening, after each step, or at the payoff. Say “الكروت دي مش مترتّبة” or “كده الجزء ده اتّرتّب”, leave the exact values visible, and explain the comparison, move, or update that changes the state. Say an individual number when it explains a decision or boundary (for example, “السبعة أكبر من الاتنين، فتتحرّك” or a pointer reaching -1). This applies to future episodes as well as revisions; it does not require removing meaningful numeric examples or results.
- Compose in Egyptian Arabic from the outset. Avoid translating an English draft phrase by phrase. For a gradual walkthrough, use “نمشي خطوة خطوة”; for checking successive values, use “نبصّ على كل رقم لحدّ ما نلاقيه”. The user prefers these to mechanically repeating “واحد واحد” as a translation of “one by one”. Choose the idiom that preserves the actual operation, rather than replacing words indiscriminately.
- Join the reasoning with natural transitions: “بس كده” for a cost or limitation, “طب نختصر ده إزاي؟” for the motivating question, “يبقى” and “عشان كده” for consequences, “بعد كده” for the next action, “أما” for a contrasting branch, and “وساعتها” for an outcome. Use them where the relation needs to be heard; do not prepend filler to every sentence. Check the joins between shots as well as each sentence alone.
- Use articles where conversational Egyptian naturally needs them. Avoid mechanically attaching “الـ” or “بالـ” to every English word, and avoid detached article fragments in synthesis input. Prefer a flowing phrase such as “عندنا Array فيها أرقام” or “بنقارن بالرقم اللي بندوّر عليه”. After defining a technical term, ordinary Arabic references such as “الرقم” or “المكان” can carry the next sentence without repeating it.
- Preserve natural definite articles when referring to an already visible number or object: “عايزين نلاقي الواحد وسبعين”، “هنا عندنا الخمسين”، “التمانية وسبعين أكبر”. The rule against mechanically prefixing English words is not a rule to strip articles from Arabic. Prefer “للواحد وسبعين” when the sentence calls for it. Keep the digits in the diagram and spell the spoken number naturally in the voiceover.
- The Arabic sentence carries the explanation. Keep technical concept names, data structures, operations named in code, and identifiers in English: `Binary Search`, `Array`, `Queue`, `Stack`, `Hash Map`, `Recursion`, `Time Complexity`, `Pseudocode`, `index`, `target`, `left`, `right`, and `middle` are examples, not a mandatory vocabulary list.
- Do not translate or phonetically respell technical terms in Arabic script. Introduce a new English term with a short Egyptian explanation, then reuse the same term and spelling in narration, captions, labels, and code. Keep ordinary connective language and actions in Arabic; there is no need to turn every sentence into English jargon.
- Keep English terms in Latin script in the written voiceover. They are spoken as English terms within the Egyptian sentence. Numbers can be written naturally for delivery, such as “حداشر”, while data and code continue to display `11`.
- The technique may be explained before it is named if that strengthens the problem-first opening. Avoid opening with a glossary.

For “بس… كده احتجنا حداشر مقارنة”, place a brief contrast pause after “بس”, then say “كده احتجنا” as a connected phrase. This separates “but” from its consequence rather than sounding like the standalone expression “بس كده”.

## Narrating pseudocode

Use descriptive, speakable identifiers such as `numbers`, `left`, `right`, and `middle` instead of `a`, `lo`, `hi`, and `mid`. Define their roles before the trace. Narrate the meaning of a statement in a complete spoken sentence; do not send raw operators, brackets, or underscores to TTS and expect a useful explanation. For `left = middle + 1`, say “نحرّك left للمكان اللي بعد middle بخطوة”. For `numbers[middle]`, say “الرقم الموجود عند middle”. Read `NOT_FOUND` as “Not Found، يعني مش موجود”. Keep the displayed code precise and time its highlight to the described operation.

## Example phrasing

**Hook:** “خمستاشر رقم… تقدر تلاقي الواحد وسبعين بأربع خطوات بسّ؟”

**Baseline → need:** “ممكن نبدأ من الأول، ونمشي خطوة خطوة لحدّ ما نلاقيه. ودي Linear Search. بس… كده احتجنا حداشر مقارنة. طب نختصر ده إزاي؟”

**Theory:** “هنا عندنا الخمسين، وإحنا عايزين الواحد وسبعين. الخمسين أصغر، يبقى كل اللي قبله أصغر كمان. عشان كده نستبعد الجزء ده.”

**Application:** “الخمسين أصغر. يبقى نحرّك left للمكان اللي بعد middle بخطوة. كده عدّينا الجزء اللي مش محتاجينه.”

**Payoff:** “وبكده لقينا الواحد وسبعين بأربع مقارنات بدل حداشر. استغلّينا الترتيب، بدل ما نفتّش في كل الأرقام.”

These examples illustrate tone; adapt the wording to the actual states and timing. Do not narrate a state update before its cause has been shown or claim a speedup beyond what the example establishes.
