# Package Architecture

Package manifests and exports own ordinary workspace edges.
`.dependency-cruiser.cjs` contains only independent architectural
prohibitions: boundaries that remain illegal even when a manifest declares
the dependency. Its runner fails closed when source or dependency coverage is
empty or any workspace source is absent. This gate judges what an import graph
cannot: whether a package is one thing, whether it sits in the layer its name
claims, and whether Effect services have the right composition and lifetime.

## Rules

1. One package is one responsibility, stated by its name. A package holding
   two responsibilities is two packages that were never separated; a package
   named for a plural (`backends`, `runners`) is a folder of implementations
   pretending to be a module. If its purpose needs "and", find the split.
2. Dependencies point one way: vocabulary and notification leaves carry shared
   language, port packages define interfaces, small capability packages own
   business acts, the domain facade composes them, and adapters implement ports.
   Nothing points back.
3. Adapters know ports, never the domain. A backend or runner that imports a
   use case has stopped being replaceable.
4. The domain knows ports, never providers. A vendor SDK, a provider name, or
   a concrete adapter appearing in the domain welds one implementation into
   the use cases.
5. The renderer knows the contract and the session vocabulary, nothing else.
   Electron and composition stay in the desktop shell, and only persistence
   touches the database.
6. Composition happens in the app root and nowhere else. The app is the only
   place adapters and the domain are named in the same file.
7. Prefer small packages wherever a responsibility can stand alone: the
   plugin interface is its own package, and each implementation of it is its
   own package beside it. A package that only ever ships with one other is a
   candidate for merging; a package whose parts serve different callers is a
   candidate for splitting.
8. Capability packages form a dependency-inversion tree. The application-facing
   domain facade assembles their Layers; the desktop consumes that facade rather
   than reconstructing the tree service by service.
9. Every dependency-cruiser rule names an independent prohibition with a
   written rationale; it never mirrors a manifest's complete allowed-edge
   list. A rule is never widened, weakened, or exempted to make a change pass
   — a violation says the code is in the wrong package.
10. If a change feels weird — an import that wants to cross a layer, a file
    that wants two homes — step back and split or refactor the package first.
    Never accept a shape because it was already there.
11. Leave coherent nearby debt cleaner when the change already touches the same
    responsibility. Use a follow-up only when that cleanup would materially
    widen or destabilize the change.
