# Binary search — sample treatment and trace

This is a style-development example, not a complete narrated script.

Learning outcome: use sorted order to eliminate half the remaining search space after a midpoint comparison.

Audience: beginner programmers familiar with variables, conditions, and loops. Introduce the meaning of a sorted `Array` and zero-based `index` before relying on either.

Format: vertical 9:16, with a 1080 × 1920 working canvas. Arrange the 15 values in clearly indexed rows, preserving ascending index order, rather than shrinking all 15 into one narrow line. Keep the retained interval unambiguous across row boundaries.

Opening question: “خمستاشر رقم… تقدر تلاقي الواحد وسبعين بأربع خطوات بسّ؟” Show the 15 sorted values and target 71 immediately, then use the linear baseline to make the four-probe challenge meaningful. Resolve that exact challenge in the final application.

The user chose “خطوات” for the opening hook; keep “مقارنات” in the detailed explanation. Each hook step means inspecting one midpoint candidate, rather than counting every code statement.

Narration follows the Egyptian Arabic delivery in [voice and terminology](voice-and-terminology.md). Technical terms such as `Binary Search`, `Array`, `Pseudocode`, `index`, and code identifiers remain in English. Use Alexandria for titles, diagram labels, and narration captions.

## Three-part treatment (2:40 target)

**0:00–0:35 — Problem/showcase.** Start on numbered physical modules. The goal, “ندور على 71,” is visible immediately. A scanner checks modules in order; each comparison costs one beat. Show the cost of a linear scan, then tease a whole region being ruled out at once. The collection's sorted order must be visible before using it.

**0:35–1:30 — Theory.** The same modules flatten into an ordered array. Mark the active interval and compare its midpoint with 71. Show why a smaller midpoint value excludes everything at or to its left. Keep eliminated objects as faint ghosts. Repeat once in the other direction. Explain that the target, if present, stays inside the remaining interval. Sorted order and efficient midpoint access are the relevant prerequisites for the usual logarithmic search-time claim.

**1:30–2:40 — Application.** Place a readable code excerpt below the array, showing roughly 3–6 relevant lines at a time. Walk through the search with matching values and bounds, making the selected code branch drive the diagram. Return index 10. Briefly show that crossed bounds mean “not found.” Resolve the opening comparison: this example takes 11 equality checks in a left-to-right linear scan and 4 midpoint probes in binary search. Do not label that a wall-clock speedup or imply it includes sorting.

## Complete pseudocode

```text
binary_search(numbers, target):
    left = 0
    right = length(numbers) - 1
    while left <= right:
        middle = floor((left + right) / 2)
        if numbers[middle] == target:
            return middle
        elif numbers[middle] < target:
            left = middle + 1
        else:
            right = middle - 1
    return NOT_FOUND
```

Precondition: `numbers` is sorted in ascending order. This returns an occurrence, not necessarily the first duplicate. Empty input returns `NOT_FOUND` without entering the loop. The worst-case probe count is logarithmic in array length; the usual time bound assumes constant-time indexed access and comparisons. Iterative auxiliary space is constant.

## Shared scene data

```text
numbers = [4, 9, 14, 21, 28, 35, 43, 50, 57, 64, 71, 78, 85, 92, 99]
target = 71
indices are zero-based
```

| Probe | left | right | middle | numbers[middle] | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 | 14 | 7 | 50 | 50 < 71; set left to 8 |
| 2 | 8 | 14 | 11 | 78 | 78 > 71; set right to 10 |
| 3 | 8 | 10 | 9 | 64 | 64 < 71; set left to 10 |
| 4 | 10 | 10 | 10 | 71 | Equality; return 10 |

The 22-second motion study in the project's `style-study/logic-workshop-ar.html` compresses this treatment using Alexandria and Egyptian Arabic captions with English technical terms. Its code panel shows an excerpt, not the complete function. The final episode must allocate time to initialization, branch execution, the invariant, and the absent-target case.
