# File Complexity

The guards enforce the floors: line caps (150 source / 300 test), the
eight-tab nesting limit, no nested ternaries, and the cognitive-complexity
ceiling. This gate judges what a guard cannot: whether a split or an
extraction is real.

## Rules

1. One file is one primary thing. Several peer concepts in one file is a
   folder of focused leaf files trying to exist.
2. A split follows responsibilities, not line counts. Files named `utils.ts`,
   `helpers.ts`, `misc.ts`, or `part2.ts` are shards, not modules.
3. Splits create folders; folders nest by responsibility. A directory with
   dozens of loose leaf files needs grouping.
4. Compression is not splitting. Dense one-liners, collapsed match arms, or
   removed blank lines to duck the cap fail this gate even when the linter
   passes.
5. Hoisting is not extracting. A function pulled out only to duck the depth
   guard, named for its mechanics or its position (`handleInner`, `doStep2`),
   is nesting wearing a function name. An extraction earns its existence by
   having a name that states what the block means.

## Review checklist

- [ ] Does every new or renamed file have one describable purpose?
- [ ] Could a reader predict each file's content from its path and name?
- [ ] Did any file get denser instead of smaller since the last revision?
- [ ] Are there sibling files that only make sense read together? (That is
      one module wearing two names.)
- [ ] Does every extracted function's name explain why it exists — could a
      reader skip its body and still follow the caller?
