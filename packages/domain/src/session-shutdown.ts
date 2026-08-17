import { decodeStoredAgentSessionStatus } from "@antumbra/agent-runtime-vocabulary";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Data, Effect, Option, PubSub, Stream } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import { decodeSessionExecutionStatus } from "#session-execution-status.ts";

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);

class SessionShutdownIncomplete extends Data.TaggedError(
	"SessionShutdownIncomplete",
)<{
	readonly intentId: string;
	readonly sessionId: string;
	readonly status: IntentStatus | "missing";
}> {}

const requireSucceeded = (
	intentId: string,
	sessionId: string,
	status: Option.Option<IntentStatus>,
) =>
	Option.match(status, {
		onNone: () =>
			Effect.fail(
				new SessionShutdownIncomplete({
					intentId,
					sessionId,
					status: "missing",
				}),
			),
		onSome: (value) =>
			value === "succeeded"
				? Effect.void
				: Effect.fail(
						new SessionShutdownIncomplete({
							intentId,
							sessionId,
							status: value,
						}),
					),
	});

export const drainActiveSessions = Effect.gen(function* () {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const feeds = yield* DomainFeeds;
	const kernel = yield* Kernel;
	const writer = yield* Writer;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const markActiveSessionsDraining = provide(
		writer.write(
			Effect.gen(function* () {
				const sessions = yield* db.AgentSession.all();
				const draining: Array<string> = [];
				for (const session of sessions) {
					const status = yield* Effect.fromResult(
						decodeStoredAgentSessionStatus(session.id, session.status),
					);
					if (status !== "open") {
						continue;
					}
					const executionStatus = yield* Effect.fromResult(
						decodeSessionExecutionStatus(session.id, session.executionStatus),
					);
					if (executionStatus === "idle") {
						continue;
					}
					draining.push(session.id);
					if (executionStatus === "active") {
						yield* db.AgentSession.where({
							executionStatus: "active",
							id: session.id,
							status: "open",
						}).update({ executionStatus: "draining" });
					}
				}
				return draining;
			}),
		),
	);
	const announce = Effect.all(
		[
			PubSub.publish(feeds.fleet, undefined),
			PubSub.publish(feeds.voyages, undefined),
		],
		{ concurrency: 1 },
	).pipe(Effect.asVoid);
	const waitForSiesta = (sessionId: string, intentId: string) =>
		provide(
			kernel.changes(intentId).pipe(
				Stream.takeUntil((status) => TERMINAL.has(status)),
				Stream.runLast,
				Effect.flatMap((status) =>
					requireSucceeded(intentId, sessionId, status),
				),
			),
		);

	while (true) {
		const sessionIds = yield* markActiveSessionsDraining;
		if (sessionIds.length === 0) {
			return;
		}
		yield* announce;
		const siestas = yield* provide(kernel.active(domain.siesta));
		yield* Effect.forEach(
			sessionIds,
			(sessionId) => {
				const current = siestas.filter(
					(intent) => intent.payload.sessionId === sessionId,
				);
				return Effect.gen(function* () {
					const intents =
						current.length > 0
							? current
							: [yield* provide(kernel.submit(domain.siesta, { sessionId }))];
					yield* Effect.forEach(
						intents,
						(intent) => waitForSiesta(sessionId, intent.id),
						{ concurrency: "unbounded" },
					);
				});
			},
			{ concurrency: "unbounded" },
		);
	}
});
