import {
	callWhileOpen,
	type DirectTool,
	type DirectToolOutcome,
} from "@antumbra/plugin-api";
import { Effect, Exit, Option, Ref, Scope } from "effect";

export interface ToolRegistry {
	readonly call: (
		threadId: string,
		name: string,
		args: unknown,
	) => Effect.Effect<Option.Option<DirectToolOutcome>>;
	readonly forget: (threadId: string) => Effect.Effect<void>;
	readonly register: (
		threadId: string,
		tools: ReadonlyArray<DirectTool>,
	) => Effect.Effect<void, never, Scope.Scope>;
}

// why: a thread's calls run under a scope of its own, so forgetting the thread
// ends them at once rather than leaving them waiting on a conversation that no
// longer exists. That scope hangs off the session's own, so a session that
// goes away without forgetting ends them too.
interface ThreadTools {
	readonly calls: Scope.Closeable;
	readonly tools: ReadonlyArray<DirectTool>;
}

type ByThread = ReadonlyMap<string, ThreadTools>;

const held = (map: ByThread, threadId: string): Option.Option<ThreadTools> =>
	Option.fromUndefinedOr(map.get(threadId));

const named = (
	entry: ThreadTools,
	name: string,
	args: unknown,
): Effect.Effect<Option.Option<DirectToolOutcome>> =>
	Option.match(
		Option.fromUndefinedOr(entry.tools.find((tool) => tool.name === name)),
		{
			onNone: () => Effect.succeed(Option.none()),
			onSome: (tool) =>
				Effect.map(callWhileOpen(entry.calls, tool, args), Option.some),
		},
	);

const served = (
	map: ByThread,
	threadId: string,
	name: string,
	args: unknown,
): Effect.Effect<Option.Option<DirectToolOutcome>> =>
	Option.match(held(map, threadId), {
		onNone: () => Effect.succeed(Option.none()),
		onSome: (entry) => named(entry, name, args),
	});

const dropped = (map: ByThread, threadId: string): ByThread => {
	const next = new Map(map);
	next.delete(threadId);
	return next;
};

const callsEnded = Option.match({
	onNone: () => Effect.void,
	onSome: (entry: ThreadTools) => Scope.close(entry.calls, Exit.void),
});

// why: one app-server child hosts every thread, and a tool call arrives on
// that one connection naming only its thread — so the tools a session was
// opened with are held here, keyed by thread, rather than on the session that
// cannot see the wire. A resumed thread registers again: codex remembers the
// specifications in its rollout, but the running process must still be able to
// answer a call.
export const makeToolRegistry: Effect.Effect<ToolRegistry> = Effect.gen(
	function* () {
		const byThread = yield* Ref.make<ByThread>(new Map());
		return {
			call: (threadId, name, args) =>
				Effect.flatMap(Ref.get(byThread), (map) =>
					served(map, threadId, name, args),
				),
			forget: (threadId) =>
				Ref.modify(byThread, (map) => [
					held(map, threadId),
					dropped(map, threadId),
				]).pipe(Effect.flatMap(callsEnded)),
			register: (threadId, tools) =>
				Effect.flatMap(Effect.scope, Scope.fork).pipe(
					Effect.flatMap((calls) =>
						Ref.update(byThread, (map) =>
							new Map(map).set(threadId, { calls, tools }),
						),
					),
				),
		} satisfies ToolRegistry;
	},
);
