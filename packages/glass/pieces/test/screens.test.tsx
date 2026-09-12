import { answered, eventually } from "@antumbra/app-testing/answers.ts";
import { choose, click, fill, labelled, press, renderedForm, submit, until } from "@antumbra/app-testing/glass/dom.ts";
import { type Api, it } from "@antumbra/app-testing/glass/entry.tsx";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { Effect } from "effect";
import { CharterPiece } from "#charter-piece.tsx";
import { PieceActs } from "#piece-acts.tsx";
import { PieceList } from "#piece-list.tsx";
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
	const charter = yield* renderedForm(container, "Charter piece");

	expect([...charter.querySelectorAll("div > span[aria-hidden]")].map((title) => title.textContent)).toEqual([
		"Title",
		"Charter",
		"Expectation",
		"Role",
		"Depends on",
	]);
	const waits = labelled<HTMLSelectElement>(charter, "Charter piece Depends on");
	expect(waits.multiple).toBe(true);
	yield* until(() => waits.options.length === 2, "the voyage's pieces to reach the depends-on field");
	expect([...waits.options].map((option) => option.textContent)).toEqual(["Soundings", "Charts"]);

	yield* fill(charter, "Charter piece Title", "Beacons");
	yield* fill(charter, "Charter piece Charter", "light the shoals");
	yield* fill(charter, "Charter piece Expectation", "every shoal is lit");
	yield* fill(charter, "Charter piece Role", "hand");
	yield* choose(waits, [soundings, charts]);
	yield* submit(container, "Charter piece");

	const landed = yield* eventually(api.pieces.byVoyage({ voyageId }), (rows) => rows.length === 3);
	let beacons = landed[0];
	for (const row of landed) {
		if (row.title === "Beacons") {
			beacons = row;
		}
	}
	expect(beacons).toMatchObject({ charter: "light the shoals", expectation: "every shoal is lit", role: "hand" });
	const wired = yield* eventually(api.pieces.edges({ voyageId }), (edges) => edges.length === 3);
	expect(wired.filter((edge) => edge.to === beacons?.id).map((edge) => edge.from)).toEqual([soundings, charts]);
});

it.glass("puts a cycle the server refuses on the field that carries what a piece waits on", function* ({ api, render }) {
	yield* charted(api);
	const container = yield* render(<RewirePiece api={api} piece={{ dependsOn: [], id: soundings, title: "Soundings", voyageId }} />);
	const rewiring = yield* renderedForm(container, "Soundings");
	const waits = labelled<HTMLSelectElement>(rewiring, "Soundings Depends on");
	yield* until(() => waits.options.length === 2, "the voyage's pieces to reach the depends-on field");

	yield* choose(waits, [charts]);
	yield* submit(container, "Soundings");

	yield* until(() => waits.getAttribute("aria-invalid") === "true", "the depends-on field to carry the server's refusal");
	expect(container.textContent).toContain("A piece cannot wait on work that waits on it");
	expect(yield* answered(api.pieces.edges({ voyageId }))).toEqual([{ from: soundings, id: `${soundings}/${charts}`, to: charts }]);
});

it.glass("launches, parks, and unparks a piece", function* ({ api, render }) {
	yield* charted(api);
	const container = yield* render(
		<Live input={{ id: soundings }} query={api.pieces.byId}>
			{(piece) => (piece === null ? null : <PieceActs api={api} piece={piece} />)}
		</Live>,
	);
	yield* until(() => container.querySelector("button") !== null, "the piece actions to appear");

	expect([...container.querySelectorAll("button")].map((button) => button.textContent)).toEqual(["Launch", "Park"]);
	yield* press(container, "Launch");

	const launched = yield* eventually(api.pieces.byId({ id: soundings }), (row) => row !== null && row.launchedAt !== null);
	expect(launched?.parkedAt).toBeNull();
	yield* press(container, "Park");
	yield* until(() => container.textContent?.includes("Unpark") === true, "Park to become Unpark");
	yield* press(container, "Unpark");
	yield* until(() => container.textContent?.includes("Unpark") === false, "Unpark to become Park");
	expect(yield* answered(api.pieces.byId({ id: soundings }))).toMatchObject({ parkedAt: null });
});

const listing = (api: Api, selected: string | undefined, onSelect: (pieceId: string | null) => void) => (
	<PieceList
		api={api}
		onRetireCrew={() => undefined}
		onSelect={onSelect}
		onWorkNow={() => undefined}
		openArtifact={() => undefined}
		readArtifact={() => Effect.die("no artifact")}
		selected={selected}
		voyageId={voyageId}
	/>
);

it.glass("opens a piece from anywhere on its row and closes it again", function* ({ api, render }) {
	yield* charted(api);
	let chosen: string | null | undefined;
	const container = yield* render(
		listing(api, undefined, (pieceId) => {
			chosen = pieceId;
		}),
	);
	yield* until(() => container.querySelector('[aria-label="Open Soundings"]') !== null, "the voyage's pieces to reach the list");
	const opening = labelled<HTMLButtonElement>(container, "Open Soundings");
	expect(opening.tagName).toBe("BUTTON");
	expect(opening.getAttribute("aria-expanded")).toBe("false");

	const preview = [...opening.querySelectorAll("span")].find((line) => line.textContent === "sound Soundings");
	if (preview === undefined) return yield* Effect.die("Missing the piece's charter preview");
	yield* click(preview);
	expect(chosen).toBe(soundings);

	const shown = yield* render(
		listing(api, soundings, (pieceId) => {
			chosen = pieceId;
		}),
	);
	yield* until(() => shown.textContent?.includes("Launch") === true, "the open piece to show what it offers");
	expect(labelled(shown, "Open Soundings").getAttribute("aria-expanded")).toBe("true");
	yield* click(labelled(shown, "Open Soundings"));
	expect(chosen).toBeNull();
});
