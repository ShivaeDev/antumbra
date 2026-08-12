# File Complexity

The structure linter enforces the caps (150 source / 300 test). This gate
judges what the cap cannot: whether a split is real.

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

## Review checklist

- [ ] Does every new or renamed file have one describable purpose?
- [ ] Could a reader predict each file's content from its path and name?
- [ ] Did any file get denser instead of smaller since the last revision?
- [ ] Are there sibling files that only make sense read together? (That is
      one module wearing two names.)
