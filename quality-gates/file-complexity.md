# File Complexity

The guards enforce the floors: line caps (150 source / 300 test), the eight-tab nesting limit, no nested ternaries, and the cognitive-complexity
ceiling. This gate judges what a guard cannot: whether a split or an extraction is real.

## Rules

1. One file is one primary thing. Several peer concepts in one file is a folder of focused leaf files trying to exist. A reader should be able to
   predict a file's purpose from its path and name.
2. A split follows responsibilities, not line counts. Files named `utils.ts`, `helpers.ts`, `misc.ts`, or `part2.ts` are shards, not modules.
3. Splits create folders; folders nest by responsibility. A directory with dozens of loose leaf files needs grouping, while sibling files that only
   make sense together are one module wearing several names. For new or reorganized modules, let the package supply its context: use
   `rulings/src/holds/`, not `rulings/src/ruling-holds/`, and put the module service definition in `holds/service.ts` beside its operations. Name
   behavior for its job, such as `watch/observer.ts`. Do not add `live.ts`, `Live` suffixes, or a separate implementation file merely because code
   constructs a Layer; an implementation distinction must name a real alternative, not split one service across ceremony.
4. Compression is not splitting. Dense one-liners, collapsed match arms, or removed blank lines to duck the cap fail this gate even when the linter
   passes.
5. Hoisting is not extracting. A function pulled out only to duck the depth guard, named for its mechanics or its position (`handleInner`, `doStep2`),
   is nesting wearing a function name. An extraction earns its existence by having a name that states what the block means.
