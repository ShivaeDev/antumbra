import { Boards } from "@antumbra/boards";
import { DomainFeeds } from "@antumbra/domain-feeds";
import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { MAIL_DELIVERY_TAG } from "#mail-delivery/demands.ts";
import { rawOf, type ScriptedBackend, sessionFor } from "#test/harness.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

export const HAND: SpawnFields = {
	agentId: "agent-post",
	backend: "scripted",
	charter: "hold the same watch",
	role: "hand",
	runner: "local",
	sessionId: "session-post",
};

export const NATIVE = "native-post";

export const wakeIntents = Effect.gen(function* () {
	const db = yield* Database;
	return yield* db.Intent.where({ tag: "agent/wake" }).all();
});

export const deliversMail = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const demand = domain.intentDemands.find((registration) => registration.tag === MAIL_DELIVERY_TAG);
	return demand === undefined ? yield* Effect.die("no mail delivery demand is registered") : yield* demand.pass;
});

export const mailed = (body: string, sourceRef: string) =>
	Effect.flatMap(Boards, (boards) =>
		boards.mail({
			authorAgentId: Option.none(),
			body,
			precedence: "priority",
			sourceRef,
			toAgentId: HAND.agentId,
		}),
	);

export const working = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(domain.spawn, HAND);
		expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
		const live = yield* sessionFor(scripted, HAND.agentId);
		const feeds = yield* DomainFeeds;
		const events = yield* feeds.subscribeSessionEvents();
		yield* live.emit({ nativeRef: NATIVE, raw: rawOf("session/opened"), type: "session.opened" });
		expect(yield* PubSub.take(events)).toMatchObject({ kind: "session.opened", sessionId: HAND.sessionId });
		const db = yield* Database;
		expect(Option.getOrThrow(yield* db.AgentSession.where({ id: HAND.sessionId }).first()).nativeRef).toBe(NATIVE);
		return live;
	}).pipe(Effect.scoped);
