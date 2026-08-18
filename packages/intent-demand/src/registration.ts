import { type IntentKind, Kernel } from "@antumbra/kernel";
import { Cause, Effect, Option } from "effect";
import { IntentDemandPassFailed } from "#errors.ts";

type KernelService = typeof Kernel.Service;
export type IntentDemandRequirements =
	| Kernel
	| Effect.Services<
			ReturnType<KernelService["active"] | KernelService["submit"]>
	  >;

export interface IntentDemandRegistration<R = IntentDemandRequirements> {
	readonly pass: Effect.Effect<void, IntentDemandPassFailed, R>;
	readonly tag: string;
}

interface IntentDemandOptions<Payload, E> {
	readonly eligible: Effect.Effect<ReadonlyArray<Payload>, E>;
	readonly identify: (payload: Payload) => string;
	readonly kind: IntentKind<Payload>;
}

const failure = (tag: string, detail: string) =>
	new IntentDemandPassFailed({ detail, tag });

const identified = <Payload>(
	tag: string,
	identify: (payload: Payload) => string,
	payload: Payload,
) =>
	Effect.try({
		catch: (error) => failure(tag, `identity threw: ${String(error)}`),
		try: () => identify(payload),
	}).pipe(
		Effect.flatMap((identity) =>
			identity.trim().length === 0
				? Effect.fail(failure(tag, "identity must not be empty"))
				: Effect.succeed(identity),
		),
	);

export const defineIntentDemand = <Payload, E>({
	eligible,
	identify,
	kind,
}: IntentDemandOptions<Payload, E>) => {
	const pass = Effect.gen(function* () {
		const kernel = yield* Kernel;
		const active = yield* kernel.active(kind);
		const activeIdentities = new Set(
			yield* Effect.forEach(active, ({ payload }) =>
				identified(kind.tag, identify, payload),
			),
		);
		const demanded = yield* eligible;
		const identities = new Set<string>();
		const missing: Array<Payload> = [];
		for (const payload of demanded) {
			const identity = yield* identified(kind.tag, identify, payload);
			if (identities.has(identity)) {
				return yield* failure(
					kind.tag,
					`eligible demand identity is duplicated: ${identity}`,
				);
			}
			identities.add(identity);
			if (!activeIdentities.has(identity)) {
				missing.push(payload);
			}
		}
		yield* Effect.forEach(missing, (payload) => kernel.submit(kind, payload), {
			concurrency: 1,
			discard: true,
		});
	}).pipe(
		Effect.catchCause((cause) =>
			Option.match(Cause.findErrorOption(cause), {
				onNone: () => Effect.fail(failure(kind.tag, Cause.pretty(cause))),
				onSome: (error) =>
					error instanceof IntentDemandPassFailed
						? Effect.fail(error)
						: Effect.fail(failure(kind.tag, String(error))),
			}),
		),
	);
	return { pass, tag: kind.tag };
};
