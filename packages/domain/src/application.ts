import { ChangeWatcher } from "@antumbra/changes/watch/observer";
import { intentDemandLayer } from "@antumbra/intent-demand";
import { KernelLive } from "@antumbra/kernel";
import { SettingsSourceLive } from "@antumbra/settings";
import { Effect, Layer } from "effect";
import { BackendCapacityReleases } from "#backend-capacity-releases/service.ts";
import { DispatcherLive } from "#dispatcher.ts";
import { AgentDomain, AgentDomainLive } from "#domain.ts";
import { FlagshipLive } from "#flagship.ts";
import { HoldSourceLive } from "#hold-source.ts";
import { IntentFeedLive } from "#intent-feed.ts";
import { KernelReachLive } from "#kernel-reach.ts";
import { RulingAscent } from "#ruling-ascent/observer.ts";
import { RulingDeliveryLive } from "#ruling-delivery.ts";
import { RulingSourceLive } from "#ruling-source.ts";
import { SessionShutdown } from "#shutdown/service.ts";
import { SightSourceLive } from "#sight.ts";
import { VoyageSourceLive } from "#voyage-source.ts";

export const applicationLayers = (...providers: Parameters<typeof AgentDomainLive>) => {
	const kernel = Layer.unwrap(
		Effect.gen(function* () {
			const domain = yield* AgentDomain;
			return KernelLive({ kinds: domain.kinds });
		}),
	).pipe(Layer.provideMerge(AgentDomainLive(...providers)));

	return Layer.mergeAll(
		HoldSourceLive,
		RulingSourceLive,
		SightSourceLive,
		VoyageSourceLive,
		ChangeWatcher(),
		DispatcherLive(),
		Layer.unwrap(
			Effect.gen(function* () {
				const domain = yield* AgentDomain;
				return intentDemandLayer(domain.intentDemands);
			}),
		),
		FlagshipLive,
		IntentFeedLive,
		KernelReachLive,
		RulingAscent,
		RulingDeliveryLive,
		SessionShutdown.layer,
	).pipe(Layer.provideMerge(BackendCapacityReleases.layer), Layer.provideMerge(kernel), Layer.provideMerge(SettingsSourceLive));
};
