# Package Architecture

`.dependency-cruiser.cjs` enforces which package may reach which. This gate
judges what a cruiser rule cannot: whether a package is one thing, and
whether it sits in the layer its name claims.

## Rules

1. One package is one responsibility, stated by its name. A package holding
   two responsibilities is two packages that were never separated; a package
   named for a plural (`backends`, `runners`) is a folder of implementations
   pretending to be a module.
2. Dependencies point one way: the vocabulary leaf carries the shared
   language, the port packages define the interfaces, the domain holds the
   use cases, and adapters implement the ports. Nothing points back.
3. Adapters know ports, never the domain. A backend or runner that imports a
   use case has stopped being replaceable.
4. The domain knows ports, never providers. A vendor SDK, a provider name, or
   a concrete adapter appearing in the domain welds one implementation into
   the use cases.
5. The renderer knows the contract and the session vocabulary, nothing else.
   Every other package is a main-process concern.
6. Composition happens in the app root and nowhere else. The app is the only
   place adapters and the domain are named in the same file.
7. Prefer small packages wherever a responsibility can stand alone: the
   plugin interface is its own package, and each implementation of it is its
   own package beside it. A package that only ever ships with one other is a
   candidate for merging; a package whose parts serve different callers is a
   candidate for splitting.
8. Every layer edge has a boundary rule with a written rationale. A rule is
   never widened, weakened, or exempted to make a change pass — a violation
   says the code is in the wrong package.
9. If a change feels weird — an import that wants to cross a layer, a file
   that wants two homes — step back and split or refactor the package first.
   Never accept a shape because it was already there.
10. Leave the module cleaner than you found it. A change that lands in a
    package is the moment to fix the misfiled file next to it.

## Review checklist

- [ ] Can each touched package's responsibility be named in one phrase
      without "and"?
- [ ] Does every new import travel down a layer, never sideways into a peer
      implementation or back up toward the app?
- [ ] Does any adapter mention a use case, or the domain mention a provider,
      an SDK, or a concrete adapter?
- [ ] Does a new package deserve its own name, or is it a folder inside an
      existing responsibility?
- [ ] Did the change add a boundary rule for the edge it introduced — and did
      it leave every existing rule at least as strict?
- [ ] Was any file placed where it fit the build rather than where it
      belongs?
