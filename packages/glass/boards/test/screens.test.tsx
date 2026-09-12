import { eventually } from "@antumbra/app-testing/answers.ts";
import { fill, labelled, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { WriteEntry } from "#write-entry.tsx";

const REEF = Id.Request.make("voyage:reef");

const voyageId = VoyageId.make(REEF);

const board = voyageBoard(voyageId);

const owner = { kind: "voyage", voyageId } as const;

const opening = {
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	context: "the reef is uncharted",
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
	kind: "voyage",
	name: "Chart the reef",
	northStar: "every shoal is known",
	requestId: REEF,
} as const;

const sailing = (api: Api) => Effect.asVoid(api.voyages.open(opening));

it.glass("writes what the admiral says onto the voyage's board", function* ({ api, render }) {
	yield* sailing(api);
	const container = yield* render(<WriteEntry api={api} owner={owner} />);
	const writing = yield* renderedForm(container, "Write");

	yield* fill(writing, "Write Entry", "the eastern approach is closed");
	yield* submit(container, "Write");

	const written = yield* eventually(api.boards.entries({ board }), (rows) => rows.length === 1);
	expect(written[0]).toMatchObject({ authorAgentId: null, body: "the eastern approach is closed", register: "smooth", seq: 1 });
});

it.glass("puts the refusal of an entry with nothing said on the field that carries it", function* ({ api, render }) {
	yield* sailing(api);
	const container = yield* render(<WriteEntry api={api} owner={owner} />);
	const writing = yield* renderedForm(container, "Write");

	yield* submit(container, "Write");

	yield* until(() => labelled(writing, "Write Entry").getAttribute("aria-invalid") === "true", "the entry field to carry the server's refusal");
	expect(container.textContent).toContain("An entry needs a body");
});
