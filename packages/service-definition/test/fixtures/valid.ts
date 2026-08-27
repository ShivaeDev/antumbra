import {
	defineService,
	type ServiceRequirements,
} from "@antumbra/service-definition";
import { Context, Data, Effect, type PubSub, type Scope } from "effect";

class Declared extends Context.Service<Declared, { readonly value: string }>()(
	"fixture/Declared",
) {}

class Residual extends Context.Service<Residual, { readonly value: number }>()(
	"fixture/Residual",
) {}

export class InitializationFailure extends Data.TaggedError(
	"InitializationFailure",
)<{ readonly detail: string }> {}

export class MethodFailure extends Data.TaggedError("MethodFailure")<{
	readonly detail: string;
}> {}

interface PrivateState {
	readonly prefix: string;
}

const requirements = [Declared, Residual] as const;
type Requirements<
	Success,
	Failure = never,
	CallerRequirements extends Scope.Scope = never,
> = ServiceRequirements<
	typeof requirements,
	Success,
	Failure,
	CallerRequirements
>;

const initialize = Effect.fn("ordinary.initialize")(function* (): Requirements<
	PrivateState,
	InitializationFailure,
	Scope.Scope
> {
	const declared = yield* Declared;
	yield* Residual;
	yield* Effect.addFinalizer(() => Effect.void);
	return { prefix: declared.value };
})();

export const Ordinary = defineService({
	id: "fixture/Ordinary",
	initialize,
	methods: (state) => ({
		read: Effect.fn("ordinary.read")(function* (
			...values: Array<number>
		): Requirements<number, MethodFailure> {
			yield* Declared;
			const residual = yield* Residual;
			if (values.length === 0) {
				return yield* new MethodFailure({ detail: state.prefix });
			}
			return values.reduce((sum, value) => sum + value, residual.value);
		}),
		subscribe: Effect.fn("ordinary.subscribe")(function* (): Requirements<
			PubSub.Subscription<number>,
			never,
			Scope.Scope
		> {
			return yield* Effect.never;
		}),
	}),
	requires: requirements,
});

export const ordinaryLayer = Ordinary.layer;

export const Stateless = defineService({
	id: "fixture/Stateless",
	initialize: Effect.void,
	methods: () => ({
		ready: Effect.fn("stateless.ready")(() => Effect.succeed(true as const)),
	}),
	requires: [],
});
