# No Speculative Complexity

Build what the current change needs. Flexibility that nothing exercises is
debt wearing a clever disguise.

## Rules

1. No abstraction with a single implementation unless a second is in active
   development.
2. No configuration options nothing sets, parameters nothing passes, or
   capability flags nothing reads.
3. No "for later" exports: if this change does not use it, it does not ship.
4. Generality must be demanded by a caller, not imagined for one.

## Review checklist

- [ ] Does every new interface have two real implementations or a concrete
      second one in flight?
- [ ] Is every option/parameter exercised by shipped code or tests?
- [ ] Could any new indirection be inlined without losing a current caller?
