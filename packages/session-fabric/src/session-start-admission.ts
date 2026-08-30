import { Deferred, Effect, Ref, Semaphore } from "effect";

interface AdmissionState {
	readonly accepting: boolean;
	readonly active: number;
	readonly idle: Deferred.Deferred<void>;
	readonly reopened: Deferred.Deferred<void>;
}

type AdmissionDecision =
	| { readonly _tag: "admitted" }
	| {
			readonly _tag: "waiting";
			readonly signal: Deferred.Deferred<void>;
	  };

const admitStart = (current: AdmissionState, nextIdle: Deferred.Deferred<void>): readonly [AdmissionDecision, AdmissionState] => {
	if (!current.accepting) {
		return [{ _tag: "waiting", signal: current.reopened }, current];
	}
	return [
		{ _tag: "admitted" },
		{
			...current,
			active: current.active + 1,
			idle: current.active === 0 ? nextIdle : current.idle,
		},
	];
};

export const makeSessionStartAdmission = Effect.gen(function* () {
	const idle = yield* Deferred.make<void>();
	const reopened = yield* Deferred.make<void>();
	yield* Deferred.succeed(idle, undefined);
	yield* Deferred.succeed(reopened, undefined);
	const state = yield* Ref.make<AdmissionState>({
		accepting: true,
		active: 0,
		idle,
		reopened,
	});
	const gate = yield* Semaphore.make(1);
	const acquire = Effect.gen(function* () {
		const nextIdle = yield* Deferred.make<void>();
		return yield* gate.withPermit(Ref.modify(state, (current) => admitStart(current, nextIdle)));
	});
	const release = Effect.gen(function* () {
		const signal = yield* gate.withPermit(
			Ref.modify(state, (current) => {
				const active = current.active - 1;
				return [active === 0 ? current.idle : undefined, { ...current, active }];
			}),
		);
		if (signal !== undefined) {
			yield* Deferred.succeed(signal, undefined);
		}
	});
	const run = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
		Effect.uninterruptibleMask((restore) =>
			Effect.gen(function* () {
				const decision = yield* acquire;
				if (decision._tag === "waiting") {
					yield* restore(Deferred.await(decision.signal));
					return yield* restore(Effect.suspend(() => run(effect)));
				}
				return yield* restore(effect).pipe(Effect.ensuring(release));
			}),
		);
	const close = Effect.uninterruptibleMask((restore) =>
		Effect.gen(function* () {
			const nextReopened = yield* Deferred.make<void>();
			const settled = yield* gate.withPermit(
				Ref.modify(state, (current) => [current.idle, current.accepting ? { ...current, accepting: false, reopened: nextReopened } : current]),
			);
			yield* restore(Deferred.await(settled));
		}),
	);
	const reopen = Effect.gen(function* () {
		const signal = yield* gate.withPermit(
			Ref.modify(state, (current) => (current.accepting ? [undefined, current] : [current.reopened, { ...current, accepting: true }])),
		);
		if (signal !== undefined) {
			yield* Deferred.succeed(signal, undefined);
		}
	});
	return { close, reopen, run } as const;
});
