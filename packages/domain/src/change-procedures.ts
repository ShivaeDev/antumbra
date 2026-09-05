import { DomainFeeds } from "@antumbra/domain-feeds";
import type { ChangeHost } from "@antumbra/plugin-api";
import { Context, Effect, Layer } from "effect";
import type { QuayReadFailure } from "#quay/read.ts";
import { Quay } from "#quay/service.ts";
import type { QuayReading } from "#quay/view.ts";

export interface ChangeHostCapabilityView {
	readonly available: boolean;
	readonly detail: string;
	readonly tag: string;
}

export interface ChangeProcedures {
	readonly capabilities: Effect.Effect<ReadonlyArray<ChangeHostCapabilityView>>;
	readonly hostTags: ReadonlyArray<string>;
	readonly quay: Effect.Effect<QuayReading, QuayReadFailure>;
	readonly requestRefresh: Effect.Effect<void>;
}

export class ChangeProcedureService extends Context.Service<ChangeProcedureService, ChangeProcedures>()("@antumbra/domain/ChangeProcedures") {}

export const ChangeProceduresLive = (hosts: ReadonlyMap<string, ChangeHost>) =>
	Layer.effect(ChangeProcedureService)(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const quay = yield* Quay;
			return ChangeProcedureService.of({
				capabilities: Effect.forEach([...hosts.values()], (host) =>
					Effect.map(host.capability, (capability) => ({
						available: capability.available,
						detail: capability.detail,
						tag: host.tag,
					})),
				),
				hostTags: [...hosts.keys()],
				quay: quay.read(),
				requestRefresh: feeds.publishChangeRefresh(),
			});
		}),
	);
