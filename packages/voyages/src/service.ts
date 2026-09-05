import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { Effect } from "effect";
import { assignAgent } from "#assign-agent.ts";
import { ensureFlagship } from "#flagship.ts";
import { open } from "#open.ts";
import { setAgentSettings } from "#set-agent-settings.ts";
import { setCaptainBackend } from "#set-captain-backend.ts";
import { setCrewBackend } from "#set-crew-backend.ts";
import { setFocus } from "#set-focus.ts";
import { verifyExists } from "#verify-exists.ts";

export const Voyages = defineService({
	id: "@antumbra/voyages/Voyages",
	requires: [Database, DomainFeeds],
	initialize: Effect.void,
	methods: () => ({ assignAgent, ensureFlagship, open, setAgentSettings, setCaptainBackend, setCrewBackend, setFocus, verifyExists }),
});
