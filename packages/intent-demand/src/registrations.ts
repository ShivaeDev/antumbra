import { Context } from "effect";
import type { IntentDemandRegistration } from "#registration.ts";

export class Registrations extends Context.Service<Registrations, ReadonlyArray<IntentDemandRegistration<never>>>()(
	"@antumbra/intent-demand/Registrations",
) {}
