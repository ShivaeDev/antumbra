# No Speculative Complexity

Build what the current change needs. Flexibility that nothing exercises is debt wearing a clever disguise.

## Rules

1. An abstraction must serve a current caller, boundary, lifetime, or composition need. One implementation can still earn that shape, and several
   implementations do not rescue an abstraction with no present purpose.
2. No configuration options nothing sets, parameters nothing passes, or capability flags nothing reads.
3. No "for later" exports: if this change does not use it, it does not ship.
4. Generality must be demanded by a current need, not imagined for one. If an indirection can be inlined without losing that need, inline it.
