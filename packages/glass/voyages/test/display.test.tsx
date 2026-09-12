import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { AgentId } from "@antumbra/domain-agents/ids.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { FLAGSHIP_REQUEST, VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Flagship } from "#flagship.tsx";
import { VoyageList } from "#voyage-list.tsx";

const opening = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "voyage",
	name: "Reef",
	northStar: "Every shoal is known",
	requestId: Id.Request.make("reef"),
} as const;
it.glass("shows live Voyage progress and routes selection and captain actions", function* ({ api, render }) {
	yield* api.voyages.open(opening);
	let selected = "";
	let hailed = "";
	const container = yield* render(
		<VoyageList
			api={api}
			onSelect={(id) => {
				selected = id;
			}}
			onHail={(id) => {
				hailed = id;
			}}
		/>,
	);
	yield* until(() => container.textContent?.includes("Nothing chartered yet") === true, "the empty voyage progress");
	yield* press(container, "Reef");
	expect(selected).toBe("reef");
	const reefRow = [...container.querySelectorAll("li")].find((row) => row.textContent?.includes("Reef") === true);
	if (reefRow === undefined) return expect.fail("the Reef row");
	yield* press(reefRow, "Hail a captain");
	expect(hailed).toBe("reef");
	yield* api.pieces.charter({
		requestId: Id.Request.make("soundings"),
		voyageId: VoyageId.make("reef"),
		title: "Soundings",
		charter: "Sound the reef",
		expectation: "Depths recorded",
		role: "hand",
		dependsOn: [],
	});
	yield* until(() => container.textContent?.includes("0 of 1 landed") === true, "the chartered piece count");
});
it.glass("offers to hail the Flagship captain before a session exists", function* ({ api, render }) {
	let hailed = "";
	const container = yield* render(
		<Flagship
			api={api}
			onHail={(id) => {
				hailed = id;
			}}
			renderSession={(id) => <p>{id}</p>}
		/>,
	);
	yield* until(() => container.textContent?.includes("Hail a captain") === true, "the Flagship captain action");
	yield* press(container, "Hail a captain");
	expect(hailed).toBe(FLAGSHIP_REQUEST);
});

it.glass("opens the Flagship captain conversation after hail", function* ({ api, render }) {
	const container = yield* render(<Flagship api={api} onHail={() => undefined} renderSession={(id) => <p>Conversation {id}</p>} />);
	yield* until(() => container.textContent?.includes("Hail a captain") === true, "the missing captain action");
	yield* api.starts.requestCaptain({
		requestId: Id.Request.make("hail"),
		agentId: AgentId.make("captain"),
		sessionId: SessionId.make("conversation"),
		voyageId: VoyageId.make(FLAGSHIP_REQUEST),
		pieceId: null,
		backend: "test",
		model: null,
		effort: null,
		role: "captain",
		charter: "Guide the fleet",
		source: "direct",
		toolSetVersion: "test-tools",
		tools: [],
	});
	yield* until(() => container.textContent?.includes("Conversation conversation") === true, "the captain conversation");
	expect(container.textContent).not.toContain("Hail a captain");
	yield* render(<VoyageList api={api} onSelect={() => undefined} onHail={() => undefined} />);
	yield* until(() => container.textContent?.includes("Captain") === true, "the working captain marker");
	expect(container.textContent).not.toContain("Hail a captain");
});
