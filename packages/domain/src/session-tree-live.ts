import { defineService } from "@antumbra/service-definition";
import { Effect, Ref } from "effect";

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
export const LiveDelegations = defineService({
	id: "@antumbra/domain/LiveDelegations",
	initialize: Effect.fn("liveDelegations.initialize")(
		function* (): Effect.fn.Return<
			Ref.Ref<ReadonlyMap<string, ReadonlySet<string>>>
		> {
			return yield* Ref.make<ReadonlyMap<string, ReadonlySet<string>>>(
				new Map(),
			);
		},
	)(),
	methods: (open) => ({
		// why: an admission is not one. A node the census was first to name is a
		// row the record was missing, not proof of a child at work — only the
		// stream carrying its frames, or the provider's own word that a turn is
		// under way in it, says that much.
		began: Effect.fn("liveDelegations.began")(function* (
			rootSessionId: string,
			nodeSessionId: string,
		): Effect.fn.Return<void> {
			yield* Ref.update(open, (current) =>
				withNode(current, rootSessionId, nodeSessionId),
			);
		}),
		delegating: Effect.fn("liveDelegations.delegating")(
			function* (): Effect.fn.Return<ReadonlySet<string>> {
				const current = yield* Ref.get(open);
				return new Set(current.keys());
			},
		),
		ended: Effect.fn("liveDelegations.ended")(function* (
			rootSessionId: string,
			nodeSessionId: string,
		): Effect.fn.Return<void> {
			yield* Ref.update(open, (current) =>
				withoutNode(current, rootSessionId, nodeSessionId),
			);
		}),
		// why: the stream is gone, so every child it was carrying is beyond reach
		// whatever its row still says. The rows keep the record's own account of
		// what was never ended; this only stops claiming the work is under way.
		released: Effect.fn("liveDelegations.released")(function* (
			rootSessionId: string,
		): Effect.fn.Return<void> {
			yield* Ref.update(open, (current) => {
				const next = new Map(current);
				next.delete(rootSessionId);
				return next;
			});
		}),
	}),
	requires: [],
});

export const LiveDelegationsLive = LiveDelegations.layer;
