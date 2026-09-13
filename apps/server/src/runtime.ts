import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { Loop } from "@antumbra/server-journal/loop.ts";
import { reconcilers } from "@antumbra/server-journal/reconcilers.ts";
import { Context, Effect, Layer, type Scope } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
import { watchChanges } from "#changes/watch.ts";
import { features } from "#features.ts";
import { reconcile as mail } from "#mail/reconcile.ts";
import { reconcile as resources } from "#resources/reconcile.ts";
import { audit } from "#sessions/audit.ts";
import { resumeCapacity } from "#sessions/capacity.ts";
import { reconcile as sessions } from "#sessions/reconcile.ts";
import { prepareSmoother } from "#smoothing/prepare.ts";
import { smoothing } from "#smoothing/run.ts";
import { supervise } from "#supervision/loops.ts";
import { rulingReconciliation } from "#tools/rulings/reconciliation.ts";
import { openFlagship } from "#voyages/flagship.ts";

export class ServerRuntime extends Context.Service<ServerRuntime, { readonly await: Effect.Effect<void> }>()("@antumbra/server/Runtime") {}

const opened = () => [
	{ name: "relaying", open: sessions() },
	{ name: "auditing", open: audit() },
	{ name: "releasing", open: resumeCapacity() },
	{ name: "reclaiming", open: resources() },
	{ name: "mailing", open: mail() },
	{ name: "watching", open: watchChanges },
	{ name: "notifying", open: rulingReconciliation },
	{ name: "smoothing", open: smoothing(prepareSmoother) },
	...reconcilers(features),
];

type Needs = Exclude<Effect.Services<ReturnType<typeof opened>[number]["open"]>, Scope.Scope>;

export const runtime = Layer.effect(
	ServerRuntime,
	Effect.gen(function* () {
		const runners = yield* RunnerOperations;
		const reactivity = yield* Reactivity;
		yield* openFlagship;
		const loops: readonly Loop<Needs>[] = opened();
		yield* supervise(loops, reactivity.stream(["runner:connected"], runners.connected));
		return { await: Effect.never };
	}),
);
