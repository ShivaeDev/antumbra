import { readArtifact } from "@antumbra/app-testing/artifacts.ts";
import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { expect } from "@effect/vitest";
import { PieceDetail } from "#piece-detail.tsx";

it.glass("shows dependencies and reads a newly landed report inside Piece detail", function* ({ api, render, run }) {
	const voyageId = VoyageId.make("reef"),
		pieceId = PieceId.make("chart");
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
		requestId: Id.Request.make(voyageId),
	});
	const charter = { voyageId, title: "Soundings", charter: "Measure the **depth**", expectation: "Depth recorded", role: "hand", dependsOn: [] };
	yield* api.pieces.charter({ ...charter, requestId: Id.Request.make("soundings") });
	yield* api.pieces.charter({ ...charter, title: "Chart", requestId: Id.Request.make(pieceId), dependsOn: ["soundings"] });
	let work = "";
	const container = yield* render(
		<PieceDetail
			api={api}
			pieceId={pieceId}
			readArtifact={(id) => run(readArtifact(id))}
			openArtifact={() => undefined}
			onWorkNow={(id) => {
				work = id;
			}}
			onRetireCrew={() => undefined}
		/>,
	);
	yield* until(() => container.textContent?.includes("Depends on: Soundings") === true, "the dependency title");
	expect(container.querySelector("strong")?.textContent).toBe("depth");
	yield* api.reports.land({
		requestId: Id.Request.make("report"),
		pieceId,
		authorAgentId: "cartographer",
		title: "Reef survey",
		body: "# A safe western passage",
	});
	yield* until(() => container.textContent?.includes("Reef survey") === true, "the landed report chip");
	yield* press(container, "Reef survey");
	yield* until(() => container.textContent?.includes("A safe western passage") === true, "the report body");
	yield* until(() => container.textContent?.includes("Work now") === true, "the completed Piece action");
	yield* press(container, "Work now");
	expect(work).toBe(pieceId);
});
