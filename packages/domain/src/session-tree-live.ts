import { Context, Effect, Layer, Ref } from "effect";

const withNode = (
	current: ReadonlyMap<string, ReadonlySet<string>>,
	rootSessionId: string,
	nodeSessionId: string,
): ReadonlyMap<string, ReadonlySet<string>> => {
	const nodes = new Set(current.get(rootSessionId) ?? []);
	nodes.add(nodeSessionId);
	return new Map(current).set(rootSessionId, nodes);
};

// why: a root with nothing left open is dropped rather than kept against an
// empty set, so the keys are the whole answer and no reader has to ask a
// second question of the value.
const withoutNode = (
	current: ReadonlyMap<string, ReadonlySet<string>>,
	rootSessionId: string,
	nodeSessionId: string,
): ReadonlyMap<string, ReadonlySet<string>> => {
	const nodes = new Set(current.get(rootSessionId) ?? []);
	nodes.delete(nodeSessionId);
	const next = new Map(current);
	if (nodes.size === 0) {
		next.delete(rootSessionId);
	} else {
		next.set(rootSessionId, nodes);
	}
	return next;
};

// why: which roots have a delegated conversation the stream they hold started
// and has not seen finish. It is memory on purpose, the way the attachment set
// is: a node is only ever reachable through the stream that opened it, so an
// acquisition that is gone can never carry another frame of its children's
// work. Losing it is safe in the one direction that matters — a restart leaves
// a fleet delegating nothing, which is exactly true of a fleet holding no
// streams.
export class LiveDelegations extends Context.Service<
	LiveDelegations,
	{
		// why: census findings never begin one. A census reports work the stream
		// never carried, which is by construction work that is no longer under way
		// on it, so admitting one names a node the record was missing rather than
		// a child that is running.
		readonly began: (
			rootSessionId: string,
			nodeSessionId: string,
		) => Effect.Effect<void>;
		readonly delegating: Effect.Effect<ReadonlySet<string>>;
		readonly ended: (
			rootSessionId: string,
			nodeSessionId: string,
		) => Effect.Effect<void>;
		// why: the stream is gone, so every child it was carrying is beyond reach
		// whatever its row still says. The rows keep the record's own account of
		// what was never ended; this only stops claiming the work is under way.
		readonly released: (rootSessionId: string) => Effect.Effect<void>;
	}
>()("@antumbra/domain/LiveDelegations") {}

export const LiveDelegationsLive = Layer.effect(LiveDelegations)(
	Effect.gen(function* () {
		const open = yield* Ref.make<ReadonlyMap<string, ReadonlySet<string>>>(
			new Map(),
		);
		return LiveDelegations.of({
			began: (rootSessionId, nodeSessionId) =>
				Ref.update(open, (current) =>
					withNode(current, rootSessionId, nodeSessionId),
				),
			delegating: Ref.get(open).pipe(
				Effect.map((current) => new Set(current.keys())),
			),
			ended: (rootSessionId, nodeSessionId) =>
				Ref.update(open, (current) =>
					withoutNode(current, rootSessionId, nodeSessionId),
				),
			released: (rootSessionId) =>
				Ref.update(open, (current) => {
					const next = new Map(current);
					next.delete(rootSessionId);
					return next;
				}),
		});
	}),
);
