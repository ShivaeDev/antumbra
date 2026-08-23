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

// why: which roots have a child at work right now — never which have a child
// whose row is merely open. It is memory on purpose, the way the attachment set
// is: a node is only ever reachable through the stream that opened it, so an
// acquisition that is gone can never carry another frame of its children's
// work. A restart therefore starts it empty, and the census a reattach takes is
// what fills it in again from the provider's own word about which children are
// running — the one account of them that outlives a stream.
export class LiveDelegations extends Context.Service<
	LiveDelegations,
	{
		// why: an admission is not one. A node the census was first to name is a
		// row the record was missing, not proof of a child at work — only the
		// stream carrying its frames, or the provider's own word that a turn is
		// under way in it, says that much.
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
