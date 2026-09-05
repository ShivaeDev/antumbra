import type { OpenSessionOptions } from "@antumbra/plugin-api";
import type { SessionRecoveryContext } from "@antumbra/sessions";
import { Voyages } from "@antumbra/voyages";
import { isVoyageCaptainIdentity } from "@antumbra/voyages/authority/captain";
import { Effect, Option } from "effect";

type ChosenSettings = Pick<OpenSessionOptions, "effort" | "model">;

const UNCHOSEN: ChosenSettings = { effort: Option.none(), model: Option.none() };

export const makeSessionAgentSettings = Effect.gen(function* () {
	const voyages = yield* Voyages;
	return (context: SessionRecoveryContext) =>
		Effect.gen(function* () {
			const voyageId = context.identity.voyageId;
			if (Option.isNone(voyageId)) {
				return UNCHOSEN;
			}
			const role = isVoyageCaptainIdentity(context.role, context.identity) ? "captain" : "crew";
			const settings = yield* voyages.readAgentSettings(voyageId.value, role);
			return {
				effort: Option.fromUndefinedOr(settings.effort),
				model: Option.fromUndefinedOr(settings.model),
			};
		});
});
