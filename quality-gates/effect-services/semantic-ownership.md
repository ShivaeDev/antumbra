# Semantic Ownership

The capability that answers a domain question owns both the persistence access and the inference needed to answer it. Its caller supplies domain input
and consumes a stable domain result. Moving inference into an exported function while leaving the database query in an unrelated caller only disguises
the dependency.

## The ownership inversion

Suppose Changes determines which resources are held by current Changes. This shape is wrong because reclamation learns Change storage and feeds owner
rows to detached Change logic:

```ts
// Bad: reclamation queries Change rows and invokes detached Change semantics.
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

Accepting a query callback instead of the rows creates the same inversion. The unrelated caller still knows which owner data to fetch, while the
exported callback or transformer merely hides the dependency from the package graph.

The capability should own the query and the answer instead. The exact names below are illustrative; they show the ownership contract rather than
claiming that every named relation exists in the current schema:

```ts
// Good: Changes owns its storage and the meaning derived from it.
export interface ChangeRead {
	readonly heldResources: (
		resources: ReadonlyArray<ResourceIdentity>,
	) => Effect.Effect<ReadonlySet<string>, ChangeReadError>;
}

const heldResources = (resources: ReadonlyArray<ResourceIdentity>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const current = yield* db.Change
			.where({ stage: "open", resourceId: { in: resources.map((resource) => resource.id) } })
			.include("repo");
		return inferHeldResources(current, resources);
	});

const reclaim = Effect.gen(function* () {
	const changes = yield* Changes;
	const held = yield* changes.heldResources(candidates);
	return selectReclaimable(candidates, held);
});
```

The pure helper may remain private inside Changes. What matters is that the capability owns the persistence representation, query, inference, and
stable answer as one boundary.

## Repeated reads

Give a common domain read a named method on its owning capability so callers do not repeat the same filtering and inference. Name the operation for
the domain question or result. Execute the query inside it and return the answer in one Effect; callers should not yield a read only to receive
another query they must execute. Private query composition remains an implementation detail.

Scope records to the requested subjects or candidates and the related evidence needed to answer the question, including transitive dependencies when
required. A global census is appropriate only when the product question is genuinely global. Moving an unfiltered table scan into a new service does
not fix its cost; neither does adding a predicate that leaves the irrelevant records in scope. Review the nested reads as well as the entry point.

Return full records by default so callers share coherent, reusable types instead of accumulating partial shapes for individual field needs. Optimize
which records are read, not how few fields are selected. Share predicates inside the owner when existing domain queries compose the same condition.
Add methods for existing domain questions; do not wrap every database operation in a generic CRUD facade.

## What remains valid

Semantic ownership is not a ban on querying, calculation, or reshaping:

- Load related data through declared Prisma relations, such as `include`, so relation names and result types remain contract-owned. Do not reconstruct
  a join with unrelated table reads and positional or identifier matching in a caller.
- Domain inference and calculation live where the question is answered. A pure private helper is part of that implementation; exporting it does not
  make foreign row access legitimate.
- A consumer may reshape a stable domain result for presentation or its own algorithm. The consumer must not rebuild the owner's result from
  persistence rows.

## Reference shape

`@antumbra/repos` demonstrates inseparable registry ownership. Registration, forgetting, related deletion sequencing, database access, and publication
stay behind the small `RepoRegistry` API. Callers receive stable `RegisteredRepo` values from registration rather than tables, query callbacks, or
exported row interpreters.

```ts
// Good: a caller reshapes the registry owner's stable answer.
const registerRepoOption = Effect.gen(function* () {
	const repos = yield* Repos;
	const { id, name } = yield* repos.register(registration);
	return { label: name, value: id };
});

// Bad: a caller writes owner rows and rebuilds the registry's answer.
const registerRepoOption = Effect.gen(function* () {
	const db = yield* Database;
	const row = yield* db.Repo.create(toRepoRow(registration));
	return { label: row.name, value: row.id };
});
```

## Review and enforcement

This boundary is semantic and requires review. Automate only facts a tool can prove, such as a forbidden package edge or a service value passed as an
ordinary parameter. Content checks, helper counts, naming patterns, and magic source totals do not prove ownership.

When feedback exposes a new ownership lesson, follow [Improving the gates](../README.md#improving-the-gates): ask why the shape is good or bad, record
the underlying invariant or cost, and update the narrow guide only when the lesson is reusable.
