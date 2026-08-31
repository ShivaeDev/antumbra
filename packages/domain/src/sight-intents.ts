import { type IntentKind, Kernel } from "@antumbra/kernel";
import { Effect } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";

export interface PendingIntent {
	readonly agentId: string | null;
	readonly detail: string | null;
	readonly id: string;
	readonly kind: string;
	readonly sessionId: string | null;
	readonly state: string;
}

interface IntentSubject {
	readonly agentId?: string;
	readonly sessionId?: string;
}

const collect = <Payload extends IntentSubject>(kind: IntentKind<Payload>) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const active = yield* kernel.active(kind);
		return active.map(
			(intent) =>
				({
					agentId: intent.payload.agentId ?? null,
					detail: intent.detail,
					id: intent.id,
					kind: kind.tag,
					sessionId: intent.payload.sessionId ?? null,
					state: intent.status,
				}) satisfies PendingIntent,
		);
	});

export const pendingIntents = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const groups = yield* Effect.all([collect(domain.spawn), collect(domain.retire), collect(domain.siesta), collect(domain.wake)], { concurrency: 1 });
	return groups.flat();
});
