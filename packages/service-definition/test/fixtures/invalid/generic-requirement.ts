import type { ServiceRequirements } from "@antumbra/service-definition";
import { Context, Effect } from "effect";

class Declared extends Context.Service<Declared, object>()(
	"invalid/Declared",
) {}
class Secret extends Context.Service<Secret, object>()("invalid/Secret") {}

const requirements = [Declared] as const;
type Requirements<
	Success,
	Failure = never,
	Passthrough = never,
> = ServiceRequirements<typeof requirements, Success, Failure, Passthrough>;

Effect.fn("invalidGenericRequirement.use")(function* <
	Success,
	Failure,
	Residual,
>(
	effect: Effect.Effect<Success, Failure, Residual>,
): Requirements<Success, Failure, Residual> {
	yield* Declared;
	yield* Secret;
	return yield* effect;
});
