import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { Reconciler } from "@shivaedev/reconciler/Reconciler.ts";
import { Context, Effect, Layer, type Scope, SubscriptionRef } from "effect";
import { Reactivity } from "effect/reactivity/Reactivity";
import { admitting } from "#agents/reconcile/admitting.ts";
import { dispatching } from "#agents/reconcile/dispatching.ts";
import { executing } from "#agents/reconcile/executing.ts";
import { resting } from "#agents/reconcile/resting.ts";
import { archiving } from "#changes/archiving.ts";
import { watchChanges } from "#changes/watch.ts";
import { reconcile as restarts } from "#lifecycle/reconcile.ts";
import { reconcile as mail } from "#mail/reconcile.ts";
import { reconcile as resources } from "#resources/reconcile.ts";
import { audit } from "#sessions/audit.ts";
import { resumeCapacity } from "#sessions/capacity.ts";
import { reconcile as sessions } from "#sessions/reconcile.ts";
import { prepareSmoother } from "#smoothing/prepare.ts";
import { smoothing } from "#smoothing/run.ts";
import type { Loops } from "#supervision/handle.ts";
import type { Loop, Work } from "#supervision/loop.ts";
import { supervise } from "#supervision/loops.ts";
import { rulingReconciliation } from "#tools/rulings/reconciliation.ts";
import { openFlagship } from "#voyages/flagship.ts";

export class ServerRuntime extends Context.Service<ServerRuntime, { readonly await: Effect.Effect<void>; readonly loops: Loops }>()(
	"@antumbra/server/Runtime",
) {}

const monitored = <E, R>(open: Effect.Effect<Reconciler<E>, never, R>): Effect.Effect<Work, never, R> =>
	Effect.map(open, (work) => ({ ...work, status: SubscriptionRef.changes(work.state) }));

const opened = () => [
	{ name: "relaying", open: monitored(sessions()) },
	{ name: "auditing", open: monitored(audit()) },
	{ name: "releasing", open: monitored(resumeCapacity()) },
	{ name: "reclaiming", open: resources() },
	{ name: "mailing", open: monitored(mail()) },
	{ name: "restarting", open: monitored(restarts()) },
	{ name: "watching", open: watchChanges },
	{ name: "notifying", open: monitored(rulingReconciliation) },
	{ name: "smoothing", open: smoothing(prepareSmoother) },
	{ name: "admitting", open: monitored(admitting()) },
	{ name: "dispatching", open: monitored(dispatching()) },
	{ name: "executing", open: monitored(executing()) },
	{ name: "resting", open: monitored(resting()) },
	{ name: "archiving", open: monitored(archiving()) },
];

type Needs = Exclude<Effect.Services<ReturnType<typeof opened>[number]["open"]>, Scope.Scope>;

export const runtime = Layer.effect(
	ServerRuntime,
	Effect.gen(function* () {
		const runners = yield* RunnerOperations;
		const reactivity = yield* Reactivity;
		yield* openFlagship;
		const loops: readonly Loop<Needs>[] = opened();
		const supervised = yield* supervise(loops, reactivity.stream(["runner:connected"], runners.connected));
		return { await: Effect.never, loops: supervised };
	}),
);
