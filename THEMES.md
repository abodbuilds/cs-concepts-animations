# CS animation themes

Organize the series into themed seasons. Each episode explains one concept through a concrete visual example, then connects it to code or practical behavior. The audience is beginner programmers; narration is conversational Egyptian Arabic with English technical terms.

| Theme | Episode topics |
| --- | --- |
| Data structures | Arrays, linked lists, stacks, queues, hash tables, trees, heaps, graphs |
| Algorithms | Binary search, sorting, BFS, DFS, shortest paths, string matching |
| Problem-solving techniques and complexity | Big O, recursion, divide and conquer, greedy algorithms, backtracking, dynamic programming |
| How computers work | Binary numbers, logic gates, CPU instructions, registers, caches, floating-point numbers |
| Memory management | Pointers, stack vs. heap, allocation, garbage collection, memory leaks |
| Operating systems | Processes, threads, scheduling, virtual memory, system calls, file systems |
| Concurrency and asynchronous programming | Event loops, async/await, race conditions, locks, deadlocks, parallel execution |
| Networking and the internet | Packets, IP addresses, DNS, TCP vs. UDP, HTTP, TLS, WebSockets |
| Databases | Tables and relationships, indexes, joins, transactions, isolation, query execution |
| Distributed systems | Replication, partitioning, consistency, consensus, retries, idempotency |
| Software architecture and design | Modularity, coupling, dependency injection, monoliths, microservices, event-driven architecture |
| Programming languages and compilers | Parsing, syntax trees, interpreters, compilers, bytecode, JIT compilation, type systems |
| Security and cryptography | Hashing, encryption, password storage, authentication, authorization, digital signatures |
| AI and machine learning fundamentals | Training vs. inference, gradient descent, overfitting, neural networks, embeddings, attention |

## Starting sequence

Suggested sequence for future batches: **Data structures → Algorithms → Memory management → Operating systems → Networking → Databases**. The sequence is flexible; related concepts can be introduced alongside the episode that needs them.

Keep individual sorting algorithms in separate episodes. Insertion sort introduces a growing sorted prefix; later episodes can cover selection sort, bubble sort, merge sort, and quicksort with their own examples and tradeoffs.

## Episode register

| Episode | Theme | Topic | Status |
| --- | --- | --- | --- |
| [001](episodes/001-binary-search/script.md) | Algorithms | Binary Search | Existing episode |
| [002](episodes/002-insertion-sort/script.md) | Algorithms | Insertion Sort | Script and silent animation for voice-over recording |

## Interactive lessons

[Algorithm Lab](webapp/dist/index.html) contains Binary Search, Insertion Sort, Selection Sort, Bubble Sort, Merge Sort, Quicksort, BFS, DFS, Dijkstra shortest paths, and naive string matching. Each lesson includes editable inputs, theory, line-by-line pseudocode, animated execution, and Arabic/English explanations. Open the standalone HTML file offline, or run `npm run web` from the project root.
