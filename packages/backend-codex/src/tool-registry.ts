import type { DirectTool } from "@antumbra/plugin-api";
import { Effect, Option, Ref } from "effect";

export interface ToolRegistry {
	readonly forget: (threadId: string) => Effect.Effect<void>;
	readonly lookup: (
		threadId: string,
		name: string,
	) => Effect.Effect<Option.Option<DirectTool>>;
	readonly register: (
		threadId: string,
		tools: ReadonlyArray<DirectTool>,
	) => Effect.Effect<void>;
}

// why: one app-server child hosts every thread, and a tool call arrives on
// that one connection naming only its thread — so the tools a session was
// opened with are held here, keyed by thread, rather than on the session that
// cannot see the wire. A resumed thread registers again: codex remembers the
// specifications in its rollout, but the running process must still be able to
// answer a call.
export const makeToolRegistry: Effect.Effect<ToolRegistry> = Effect.gen(
	function* () {
		const byThread = yield* Ref.make<
			ReadonlyMap<string, ReadonlyArray<DirectTool>>
		>(new Map());
		return {
			forget: (threadId) =>
				Ref.update(byThread, (map) => {
					const next = new Map(map);
					next.delete(threadId);
					return next;
				}),
			lookup: (threadId, name) =>
				Ref.get(byThread).pipe(
					Effect.map((map) =>
						Option.fromUndefinedOr(
							map.get(threadId)?.find((tool) => tool.name === name),
						),
					),
				),
			register: (threadId, tools) =>
				Ref.update(byThread, (map) => new Map(map).set(threadId, tools)),
		} satisfies ToolRegistry;
	},
);
