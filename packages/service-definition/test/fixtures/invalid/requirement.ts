import {
	defineService,
	type ServiceRequirements,
} from "@antumbra/service-definition";
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

const operation = Effect.fn("invalidRequirement.operation")(
	function* (): Requirements<void> {
		yield* Declared;
		yield* Secret;
	},
);

defineService({
	id: "fixture/InvalidRequirement",
	requires: requirements,
	operations: { operation },
});
