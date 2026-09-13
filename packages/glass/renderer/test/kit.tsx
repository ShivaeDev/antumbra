import { eventually } from "@antumbra/app-testing/answers.ts";
import type { Api } from "@antumbra/app-testing/glass/entry.tsx";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import type { ConsolePlace } from "@antumbra/platform-shell/windows.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import type { ReactNode } from "react";
import { VoyagesScreen } from "#navigation/voyages.tsx";
import type { Shell } from "#shell.ts";

export const REEF = Request.make("voyage:reef");
const SOUNDINGS = Request.make("piece:soundings");
const HAND = Request.make("agent:soundings");
const CAPTAIN = Request.make("agent:captain");

export const voyageId = VoyageId.make(REEF);
export const pieceId = PieceId.make(SOUNDINGS);

export const NAME = "Chart the reef";
export const NORTH_STAR = "every shoal is known";
export const CHARTER = "the reef is uncharted";

export const crewed = Effect.fnUntraced(function* (api: Api) {
	yield* api.voyages.open({
		requestId: REEF,
		kind: "voyage",
		name: NAME,
		northStar: NORTH_STAR,
		context: CHARTER,
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
	yield* api.agents.workNow({ requestId: HAND, pieceId });
	yield* api.agents.hail({ requestId: CAPTAIN, voyageId, by: "admiral" });
	return yield* eventually(api.agents.roster({}), (agents) => agents.length === 2, "both agents to reach the roster");
});

export const shell: Shell = {
	place: Effect.succeed({ role: "console", mode: "voyages", changeId: null, pieceId: null, sessionId: null, voyageId }),
	info: Effect.succeed({ productVersion: "1", chromeVersion: "1", electronVersion: "1", nodeVersion: "1" }),
	remember: () => Effect.void,
	open: () => Effect.void,
	restart: Effect.void,
	restartServer: Effect.void,
	openExternal: () => undefined,
};

export const opened: ConsolePlace = { role: "console", mode: "voyages", changeId: null, pieceId: null, sessionId: null, voyageId };

export const listing: ConsolePlace = { ...opened, voyageId: null };

export const screen = (api: Api, place: ConsolePlace, onPlace: (next: ConsolePlace) => void): ReactNode => (
	<VoyagesScreen
		api={api}
		onError={(message: string) => Effect.runSync(Effect.die(message))}
		onPlace={onPlace}
		place={place}
		readArtifact={() => Effect.die("no artifact in this test")}
		renderSession={(sessionId: string) => <output>{sessionId}</output>}
		shell={shell}
	/>
);

export const BARE = Request.make("voyage:bar");

export const bare = {
	requestId: BARE,
	kind: "voyage" as const,
	name: "Sound the bar",
	northStar: "the bar is sounded",
	context: "",
	captainBackend: null,
	captainModel: null,
	captainEffort: null,
	crewBackend: null,
	crewModel: null,
	crewEffort: null,
};
