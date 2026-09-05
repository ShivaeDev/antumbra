import { DomainFeeds } from "@antumbra/domain-feeds";
import type { ChangeHost } from "@antumbra/plugin-api";
import { Context, Effect, Layer } from "effect";
import { type QuayReading, quayReading } from "#quay-view.ts";
import type { VoyageWorldReadFailure } from "#voyage-world/read.ts";
import { VoyageWorldSource } from "#voyage-world/service.ts";

export interface ChangeHostCapabilityView {
	readonly available: boolean;
	readonly detail: string;
	readonly tag: string;
}

export interface ChangeProcedures {
	readonly capabilities: Effect.Effect<ReadonlyArray<ChangeHostCapabilityView>>;
	readonly hostTags: ReadonlyArray<string>;
	readonly quay: Effect.Effect<QuayReading, VoyageWorldReadFailure>;
	readonly requestRefresh: Effect.Effect<void>;
}

export class ChangeProcedureService extends Context.Service<ChangeProcedureService, ChangeProcedures>()("@antumbra/domain/ChangeProcedures") {}

export const ChangeProceduresLive = (hosts: ReadonlyMap<string, ChangeHost>) =>
	Layer.effect(ChangeProcedureService)(
		Effect.gen(function* () {
			const feeds = yield* DomainFeeds;
			const world = yield* VoyageWorldSource;
			return ChangeProcedureService.of({
				capabilities: Effect.forEach([...hosts.values()], (host) =>
					Effect.map(host.capability, (capability) => ({
						available: capability.available,
						detail: capability.detail,
						tag: host.tag,
					})),
				),
				hostTags: [...hosts.keys()],
				quay: world.read().pipe(Effect.map(quayReading)),
				requestRefresh: feeds.publishChangeRefresh(),
			});
		}),
	);
