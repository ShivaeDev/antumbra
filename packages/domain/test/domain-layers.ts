import { dirname, join } from "node:path";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { SessionFabricLive } from "@antumbra/session-fabric";
import {
	dispatchingLayer,
	domainKernelLayer,
	passiveRunner,
	watchingLayer,
} from "@antumbra/testing";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { BackendCapacityReleaseLive } from "#backend-capacity-release.ts";
import { domainCapabilities } from "#domain-capabilities.ts";
import { KernelReachInstaller } from "#kernel-reach.ts";
import { SightSourceLive } from "#sight.ts";
import { fakeKernelReach } from "#test/kernel-reach-fixture.ts";

export { dispatchingLayer, domainKernelLayer, watchingLayer };

const artifactsDirectory = (temporary: TemporaryPersistence) =>
	join(dirname(temporary.database), "artifacts");

const fakeKernelReachLive = Layer.effectDiscard(
	Effect.gen(function* () {
		const installer = yield* KernelReachInstaller;
		yield* installer.install(fakeKernelReach);
	}),
);

export const domainCapabilityLayer = (temporary: TemporaryPersistence) =>
	fakeKernelReachLive.pipe(
		Layer.provideMerge(
			domainCapabilities(
				new Map(),
				new Map([[passiveRunner.tag, passiveRunner]]),
				artifactsDirectory(temporary),
			).pipe(
				Layer.provide(SessionFabricLive),
				Layer.provide(NodeServices.layer),
			),
		),
		Layer.provideMerge(temporary.layer),
	);

export const sightSourceTestLayer = SightSourceLive.pipe(
	Layer.provideMerge(BackendCapacityReleaseLive),
);
