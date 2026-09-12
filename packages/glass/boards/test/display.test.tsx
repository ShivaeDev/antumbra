import { click, labelled, press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { voyageBoard } from "@antumbra/domain-boards/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { BoardPanel } from "#board.tsx";

it.glass("keeps rough board evidence behind its live summary", function* ({ api, render }) {
	const voyageId = VoyageId.make("reef");
	const board = voyageBoard(voyageId);
	yield* api.voyages.open({
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
	});
	yield* api.boards.write({ requestId: Id.Request.make("entry"), board, author: "crew", body: "The eastern shoal is shallow", register: "rough" });
	const container = yield* render(<BoardPanel api={api} name="Reef" owner={{ kind: "voyage", voyageId }} />);
	yield* until(() => container.textContent?.includes("1") === true, "the board count");
	expect(container.textContent).not.toContain("The eastern shoal");
	yield* click(labelled(container, "Board"));
	yield* until(() => container.textContent?.includes("The eastern shoal") === true, "the rough entry");
	yield* api.boards.summarize({
		requestId: Id.Request.make("summary"),
		board,
		author: "smoother",
		body: "Use the western approach",
		coversFrom: 1,
		coversTo: 1,
		level: "day",
	});
	yield* until(() => container.textContent?.includes("Use the western approach") === true, "the new summary");
	expect(container.textContent).not.toContain("The eastern shoal");
	yield* api.boards.summarize({
		requestId: Id.Request.make("piece-summary"),
		board,
		author: "smoother",
		body: "The reef is charted",
		coversFrom: 1,
		coversTo: 2,
		level: "piece",
	});
	yield* until(() => container.textContent?.includes("The reef is charted") === true, "the encompassing summary");
	expect(container.textContent).not.toContain("Use the western approach");
	yield* press(container, "1 day · 1 entry");
	yield* until(() => container.textContent?.includes("Use the western approach") === true, "the nested day summary");
	yield* press(container, "1 entry");
	yield* until(() => container.textContent?.includes("The eastern shoal") === true, "the covered evidence");
	expect(container.textContent).toContain("Smoother");
});
