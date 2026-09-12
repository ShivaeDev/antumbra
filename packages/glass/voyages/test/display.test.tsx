import { click, labelled, press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { identity } from "@antumbra/domain-agents/ids.ts";
import { FLAGSHIP_REQUEST, VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
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
	const card = labelled<HTMLButtonElement>(container, "Open Reef");
	expect(card.tagName).toBe("BUTTON");
	const northStar = [...card.querySelectorAll("span")].find((line) => line.textContent === "Every shoal is known");
	if (northStar === undefined) return expect.fail("the voyage's north star");
	yield* click(northStar);
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
	const hail = Id.Request.make("hail");
	yield* api.agents.hail({ requestId: hail, voyageId: VoyageId.make(FLAGSHIP_REQUEST) });
	yield* until(() => container.textContent?.includes(`Conversation ${identity(hail).sessionId}`) === true, "the captain conversation");
	expect(container.textContent).not.toContain("Hail a captain");
	yield* render(<VoyageList api={api} onSelect={() => undefined} onHail={() => undefined} />);
	yield* until(() => container.textContent?.includes("Captain") === true, "the working captain marker");
	expect(container.textContent).not.toContain("Hail a captain");
});

it.glass("refuses a second hail of a captain already on the way with its typed rejection", function* ({ api, render }) {
	const container = yield* render(<Flagship api={api} onHail={() => undefined} renderSession={(id) => <p>Conversation {id}</p>} />);
	yield* until(() => container.textContent?.includes("Hail a captain") === true, "the missing captain action");
	yield* api.agents.hail({ requestId: Id.Request.make("first-hail"), voyageId: VoyageId.make(FLAGSHIP_REQUEST) });
	const refusal = yield* Effect.flip(api.agents.hail({ requestId: Id.Request.make("second-hail"), voyageId: VoyageId.make(FLAGSHIP_REQUEST) }));
	expect(refusal).toMatchObject({ _tag: "CaptainAlreadyHailed", agentId: identity(Id.Request.make("first-hail")).agentId });
});
