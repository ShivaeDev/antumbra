import { click, labelled, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { CaptainCall } from "#captain.tsx";
import { Crew } from "#crew.tsx";

const REEF = Request.make("voyage:reef");
const HAIL = Request.make("agent:captain");

const voyageId = VoyageId.make(REEF);

const crewed = Effect.fnUntraced(function* (api: Api) {
	yield* api.voyages.open({
		requestId: REEF,
		kind: "voyage",
		name: "Chart the reef",
		northStar: "every shoal is known",
		context: "",
		captainBackend: null,
		captainModel: null,
		captainEffort: null,
		crewBackend: null,
		crewModel: null,
		crewEffort: null,
	});
	yield* api.agents.hail({ requestId: HAIL, voyageId });
});

it.glass("opens the captain from the line that names the captain", function* ({ api, render }) {
	yield* crewed(api);
	let opened = "";
	const container = yield* render(
		<CaptainCall
			api={api}
			onAgent={(agentId) => {
				opened = agentId;
			}}
			onHail={() => undefined}
			voyageId={voyageId}
		/>,
	);
	const opening = `Open the captain ${identity(HAIL).agentId}`;
	yield* until(() => container.querySelector(`[aria-label="${opening}"]`) !== null, "the captain line to name its agent");
	yield* click(labelled(container, opening));
	expect(opened).toBe(identity(HAIL).agentId);
});

it.glass("opens a member of the crew from its own row", function* ({ api, render }) {
	yield* crewed(api);
	let opened = "";
	const container = yield* render(
		<Crew
			api={api}
			onAgent={(agentId) => {
				opened = agentId;
			}}
			voyageId={voyageId}
		/>,
	);
	const opening = `Open captain ${identity(HAIL).agentId}`;
	yield* until(() => container.querySelector(`[aria-label="${opening}"]`) !== null, "the crew row to reach the list");
	yield* click(labelled(container, opening));
	expect(opened).toBe(identity(HAIL).agentId);
});
