# Effect Services

Effect services are how runtime code states dependencies and where capability
boundaries own invariants. This gate covers the design judgment behind the
service-parameter lint rule.

## Rules

1. A function yields each service it needs and exposes that requirement in its
   Effect environment. Do not pass a service implementation, database handle,
   writer-shaped value, `Context`, or dependency bundle through an ordinary
   parameter.
2. Layers provide implementations and close environments at composition roots.
   A Layer is the lifetime and sharing boundary; reconstructing service objects
   ad hoc loses that identity.
3. A domain capability owns the whole business act: validation, transaction,
   durable writes, and notifications after commit. Its caller names the act and
   supplies only domain input.
4. Keep services small and composable. Give a capability its own package when
   that creates a real, named responsibility and a one-way dependency edge;
   do not create packages that exist only to hold an interface.
5. Close Effect requirements before a callback crosses into a foreign SDK. The
   domain compiles a provider callback by yielding its exact capabilities; the
   adapter receives an `R = never` callback and never carries a domain Context.
6. Adapters may accept constructed foreign values at their boundary, and tests
   may inject a narrow fake through a Layer. Neither exception permits service
   plumbing through production business functions. When touched legacy
   plumbing is removed, its active debt-baseline entry leaves with it.

## Semantic ownership

The capability that answers a domain question owns the persistence access and
the inference needed to answer it. A caller asks the capability the question;
it does not fetch the capability's rows and send them through an exported
transformer, callback, or predicate. Moving the calculation into another
function without moving the database read only disguises the dependency.

For example, a Changes capability may decide which resources are held by
current Changes. The exact names below are illustrative; the ownership is the
contract:

```ts
// Good: Changes owns both its rows and the meaning derived from them.
export interface ChangeRead {
	readonly heldResources: (
		resources: ReadonlyArray<ResourceIdentity>,
	) => Effect.Effect<ReadonlySet<string>, ChangeReadError>;
}

const heldResources = (resources: ReadonlyArray<ResourceIdentity>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const current = yield* db.Change
			.where({ stage: "open" })
			.include("repo", db.Repo.select("id", "source"));
		return inferHeldResources(current, resources);
	});

const reclaim = Effect.gen(function* () {
	const changes = yield* Changes;
	const held = yield* changes.heldResources(candidates);
	return selectReclaimable(candidates, held);
});
```

The opposite shape punches a Changes dependency through an unrelated caller:

```ts
// Bad: reclamation knows Change storage and supplies rows to detached logic.
export const inferHeldResources = (
	changeRows: ReadonlyArray<ChangeRow>,
	resources: ReadonlyArray<ResourceIdentity>,
) => /* Change semantics */;

const reclaim = Effect.gen(function* () {
	const db = yield* Database;
	const changeRows = yield* db.Change.where({ stage: "open" }).all();
	const held = inferHeldResources(changeRows, candidates);
	return selectReclaimable(candidates, held);
});
```

This rule does not require every data operation to become a new service:

- Filtering and projection select less owner data; they do not move ownership.
  Filter in the owning capability rather than loading a table for a caller to
  interpret.
- Load related data through declared Prisma relations, such as `include`, so
  relation names and result types remain contract-owned. Do not reconstruct a
  join with unrelated table reads and positional or identifier matching in a
  caller.
- Domain inference and calculation live where the question is answered. A pure
  private helper is fine inside that owner; exporting it does not make foreign
  row access legitimate.
- A consumer may reshape a stable domain result for presentation or its own
  algorithm. Mapping `ReadonlyArray<RegisteredRepo>` to select options is
  ordinary consumption; mapping persistence `Repo` rows into a registry model
  outside Repos is stolen ownership.

`@antumbra/repos` is the reference shape. Registration, listing, forgetting,
the complete related deletion transaction, database access, and post-commit
publication are inseparable registry ownership. Callers see the small
`RepoRegistry` API and stable `RegisteredRepo` types, not tables, query
callbacks, or exported row interpreters.

```ts
// Good: presentation reshapes an answer from the registry owner.
const repoOptions = Effect.gen(function* () {
	const repos = yield* Repos;
	return (yield* repos.list).map(({ id, name }) => ({ label: name, value: id }));
});

// Bad: presentation reads owner rows and rebuilds the registry's answer.
const repoOptions = Effect.gen(function* () {
	const db = yield* Database;
	return (yield* db.Repo.all()).map(summarizeRepo);
});
```

The boundary is semantic and still requires review. Automate only facts a tool
can prove, such as a forbidden package edge or a service value passed as an
ordinary parameter. Do not substitute content checks, helper counts, naming
patterns, or magic source totals for ownership judgment.
