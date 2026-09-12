import { answered } from "@antumbra/app-testing/entry.ts";
import { choose, labelled, press, settle, submit, until, write } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Effect, Stream } from "effect";
import { CharterPiece } from "#charter-piece.tsx";
import { PieceActs } from "#piece-acts.tsx";
import { RewirePiece } from "#rewire-piece.tsx";

const REEF = Id.Request.make("voyage:reef");
const SOUNDINGS = Id.Request.make("piece:soundings");
const CHARTS = Id.Request.make("piece:charts");

const voyageId = VoyageId.make(REEF);
const soundings = PieceId.make(SOUNDINGS);
const charts = PieceId.make(CHARTS);

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

const chartering = (requestId: Id.Request, title: string, dependsOn: readonly string[] = []) => ({
	charter: `sound ${title}`,
	dependsOn,
	expectation: `${title} is landed`,
	requestId,
	role: "hand",
	title,
	voyageId,
});

const charted = Effect.fnUntraced(function* (api: Api) {
	yield* api.voyages.open(opening);
	yield* api.pieces.charter(chartering(SOUNDINGS, "Soundings"));
	yield* api.pieces.charter(chartering(CHARTS, "Charts", [soundings]));
});

it.glass("charters a piece that waits on the pieces its form offers", function* ({ api, render }) {
	yield* charted(api);
	const container = yield* render(<CharterPiece api={api} onChartered={() => undefined} voyageId={voyageId} />);
	yield* until(() => container.querySelectorAll("form").length === 1);

	expect([...container.querySelectorAll("div > span[aria-hidden]")].map((title) => title.textContent)).toEqual([
		"Title",
		"Charter",
		"Expectation",
		"Role",
		"Depends on",
	]);
	const waits = labelled<HTMLSelectElement>(container, "Charter piece Depends on");
	expect(waits.multiple).toBe(true);
	yield* until(() => waits.options.length === 2);
	expect([...waits.options].map((option) => option.textContent)).toEqual(["Soundings", "Charts"]);

	yield* settle(() => write(labelled<HTMLInputElement>(container, "Charter piece Title"), "Beacons"));
	yield* settle(() => write(labelled<HTMLTextAreaElement>(container, "Charter piece Charter"), "light the shoals"));
	yield* settle(() => write(labelled<HTMLInputElement>(container, "Charter piece Expectation"), "every shoal is lit"));
	yield* settle(() => write(labelled<HTMLInputElement>(container, "Charter piece Role"), "hand"));
	yield* settle(() => choose(waits, [soundings, charts]));
	yield* submit(container, 0);

	const landed = yield* answered(api.pieces.byVoyage({ voyageId }).pipe(Stream.filter((rows) => rows.length === 3)));
	let beacons = landed[0];
	for (const row of landed) {
		if (row.title === "Beacons") {
			beacons = row;
		}
	}
	expect(beacons).toMatchObject({ charter: "light the shoals", expectation: "every shoal is lit", role: "hand" });
	const wired = yield* answered(api.pieces.edges({ voyageId }).pipe(Stream.filter((edges) => edges.length === 3)));
	expect(wired.filter((edge) => edge.to === beacons?.id).map((edge) => edge.from)).toEqual([soundings, charts]);
});

it.glass("puts a cycle the server refuses on the field that carries what a piece waits on", function* ({ api, render }) {
	yield* charted(api);
	const container = yield* render(<RewirePiece api={api} piece={{ dependsOn: [], id: soundings, title: "Soundings", voyageId }} />);
	const waits = labelled<HTMLSelectElement>(container, "Soundings Depends on");
	yield* until(() => waits.options.length === 2);

	yield* settle(() => choose(waits, [charts]));
	yield* press(container, "Save position");

	yield* until(() => waits.getAttribute("aria-invalid") === "true");
	expect(container.textContent).toContain("A piece cannot wait on work that waits on it");
	expect(yield* answered(api.pieces.edges({ voyageId }))).toEqual([{ from: soundings, id: `${soundings}/${charts}`, to: charts }]);
});

it.glass("offers the acts a piece stands ready for and sends the one pressed", function* ({ api, render }) {
	yield* charted(api);
	const container = yield* render(<PieceActs api={api} piece={{ id: soundings, launchedAt: null, parkedAt: null }} />);

	expect([...container.querySelectorAll("button")].map((button) => button.textContent)).toEqual(["Launch", "Park"]);
	yield* press(container, "Launch");

	const launched = yield* answered(api.pieces.byId({ id: soundings }).pipe(Stream.filter((row) => row !== null && row.launchedAt !== null)));
	expect(launched?.parkedAt).toBeNull();
});
