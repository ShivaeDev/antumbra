import { Database } from "@antumbra/persistence";
import type { OpenSessionOptions } from "@antumbra/plugin-api";
import type { SessionRecoveryContext } from "@antumbra/sessions";
import { Effect, Option } from "effect";
import { agentSettingsOf } from "#agent-settings.ts";
import { isVoyageCaptainIdentity } from "#voyage-captain.ts";

type ChosenSettings = Pick<OpenSessionOptions, "effort" | "model">;

const UNCHOSEN: ChosenSettings = { effort: Option.none(), model: Option.none() };

export const makeSessionAgentSettings = Effect.gen(function* () {
	const db = yield* Database;
	return (context: SessionRecoveryContext) =>
		Effect.gen(function* () {
			const voyageId = context.identity.voyageId;
			if (Option.isNone(voyageId)) {
				return UNCHOSEN;
			}
			const voyage = yield* db.Voyage.where({ id: voyageId.value }).first();
			if (Option.isNone(voyage)) {
				return UNCHOSEN;
			}
			const role = isVoyageCaptainIdentity(context.role, context.identity) ? "captain" : "crew";
			const settings = agentSettingsOf(voyage.value, role);
			return {
				effort: Option.fromUndefinedOr(settings.effort),
				model: Option.fromUndefinedOr(settings.model),
			};
		});
});
