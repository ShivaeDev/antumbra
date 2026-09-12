import { unaudited } from "@antumbra/domain-sessions/queries/unaudited.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { each } from "@antumbra/server-journal/reconcile.ts";
import { Effect, Option, Stream } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
export const audit = Effect.fn("Sessions.audit")(function* () {
	const runners = yield* RunnerOperations;
	const reactivity = yield* Reactivity;
	return yield* each(
		unaudited,
		{},
		({ node }) => node.id,
		Effect.fn("Sessions.auditNode")(function* ({ node, root }) {
			if (node.nativeRef === null || root.nativeRef === null) return;
			const available = reactivity
				.stream(["runner:connected"], runners.connected)
				.pipe(Stream.filter((connected) => connected.some((runner) => runner.runnerId === root.runnerId && runner.backends.includes(root.backend))));
			const connected = yield* Stream.runHead(available).pipe(Effect.map(Option.getOrThrow));
			const runner = connected.find((runner) => runner.runnerId === root.runnerId);
			if (runner === undefined) return;
			yield* runners.execute(runner.runnerId, {
				type: "Audit",
				requestId: `session-audit:${node.id}:${node.idleSince}`,
				sessionId: root.id,
				backend: root.backend,
				cwd: root.cwd,
				rootRef: root.nativeRef,
				nodeRef: node.nativeRef,
			});
		}),
	);
});
