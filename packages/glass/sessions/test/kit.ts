import { click, until } from "@antumbra/app-testing/glass/dom.ts";
import type { Api } from "@antumbra/app-testing/glass/entry.tsx";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";

export const REEF = Request.make("voyage:reef");
export const SOUNDINGS = Request.make("piece:soundings");
export const CREW = Request.make("agent:soundings");
export const SMOOTHER = Request.make("agent:smoothing");

export const VOYAGE_NAME = "Chart the reef";

export const voyageId = VoyageId.make(REEF);
export const pieceId = PieceId.make(SOUNDINGS);

export const charted = Effect.fnUntraced(function* (api: Api) {
	yield* api.voyages.open({
		requestId: REEF,
		kind: "voyage",
		name: VOYAGE_NAME,
		northStar: "every shoal is known",
		context: "the reef is uncharted",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
	});
	yield* api.pieces.charter({
		requestId: SOUNDINGS,
		voyageId,
		title: "Soundings",
		charter: "sound the reef",
		expectation: "Soundings is landed",
		role: "hand",
		dependsOn: [],
	});
});

export const crewed = Effect.fnUntraced(function* (api: Api) {
	yield* charted(api);
	yield* api.agents.workNow({ requestId: CREW, pieceId });
});

export const smoothing = Effect.fnUntraced(function* (api: Api) {
	const ids = identity(SMOOTHER);
	yield* api.agents.smooth({ requestId: SMOOTHER, agentId: ids.agentId, sessionId: ids.sessionId, voyageId, cwd: null });
});

const groupTrigger = (container: HTMLElement, title: string): HTMLElement | undefined => {
	for (const candidate of container.querySelectorAll<HTMLElement>('[data-slot="collapsible-trigger"]')) {
		if (candidate.textContent?.startsWith(title) === true) return candidate;
	}
	return undefined;
};

export const openGroup = (container: HTMLElement, title: string): Effect.Effect<void> =>
	Effect.gen(function* () {
		yield* until(() => groupTrigger(container, title) !== undefined, `the ${title} group to reach the list`);
		const found = groupTrigger(container, title);
		if (found === undefined) return yield* Effect.die(`no group named "${title}"`);
		yield* click(found);
	});
