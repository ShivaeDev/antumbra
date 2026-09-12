import { prepareArtifactSource } from "@antumbra/app-testing/artifact-source.ts";
import { landArtifact, readArtifact } from "@antumbra/app-testing/artifacts.ts";
import { click, press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { ArtifactId } from "@antumbra/domain-artifacts/ids.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { assert, expect } from "vitest";
import { ArtifactOutcomes } from "#artifact-outcomes.tsx";
import { ArtifactWindow } from "#artifact-window.tsx";

const voyageId = VoyageId.make("voyage:reef");
const pieceId = PieceId.make("piece:reef");
const old = ArtifactId.make("artifact:old");
const next = ArtifactId.make("artifact:new");
const opening = {
	requestId: Id.Request.make(voyageId),
	kind: "voyage",
	name: "Reef",
	northStar: "Safe passage",
	context: "Sound the reef",
	captainBackend: null,
	captainEffort: null,
	captainModel: null,
	crewBackend: null,
	crewEffort: null,
	crewModel: null,
} as const;
const landing = { pieceId, authorAgentId: "agent:cartographer", path: "old.md", title: "Old chart", supersedesArtifactId: null };

it.glass("revisions update the current artifact and keep readable history", function* ({ api, artifacts, render, run }) {
	yield* api.voyages.open(opening);
	yield* api.pieces.charter({
		requestId: Id.Request.make(pieceId),
		voyageId,
		title: "Reef chart",
		charter: "Make a chart",
		expectation: "A chart",
		role: "hand",
		dependsOn: [],
	});
	yield* run(prepareArtifactSource({ agentId: "agent:cartographer", sessionId: "session:chart" }));
	artifacts.source.set("old.md", "# First sounding");
	artifacts.source.set("new.md", "# Latest sounding");
	yield* run(landArtifact({ ...landing, requestId: Id.Request.make(old) }));
	const read = (id: ArtifactId) => run(readArtifact(id));
	let opened: ArtifactId | undefined;
	const container = yield* render(
		<ArtifactOutcomes
			api={api}
			pieceId={pieceId}
			read={read}
			openWindow={(id) => {
				opened = id;
			}}
		/>,
	);
	yield* until(() => container.textContent?.includes("Old chart") === true, "the current artifact");
	yield* run(landArtifact({ ...landing, requestId: Id.Request.make(next), path: "new.md", title: "New chart", supersedesArtifactId: old }));
	yield* until(() => container.querySelector("details") !== null, "the revision's history");
	const current = [...container.querySelectorAll("button")].filter((button) => button.closest("details") === null);
	expect(current.map((button) => button.textContent?.trim())).toEqual(["New chart"]);
	expect(container.querySelector("details")?.textContent).toContain("Old chart");
	yield* press(container, "New chart");
	yield* until(() => container.textContent?.includes("Latest sounding") === true, "the current markdown");
	const open = container.querySelector<HTMLButtonElement>('[aria-label="Open in a window"]');
	assert(open !== null);
	yield* click(open);
	expect(opened).toBe(next);
	const disclosure = container.querySelector("summary");
	assert(disclosure !== null);
	yield* click(disclosure);
	yield* press(container, "Old chart");
	yield* until(() => container.textContent?.includes("First sounding") === true, "the historical markdown");
	yield* render(<ArtifactWindow artifactId={next} read={read} />);
	yield* until(() => document.title === "New chart", "the artifact window title");
	expect(container.textContent).toContain("Latest sounding");
});

it.glass("an unknown artifact shows its read refusal", function* ({ render, run }) {
	const container = yield* render(<ArtifactWindow artifactId={ArtifactId.make("missing")} read={(id) => run(readArtifact(id))} />);
	yield* until(() => container.querySelector('[role="alert"]') !== null, "the missing artifact refusal");
	expect(container.querySelector('[role="alert"]')?.textContent).toContain("This Artifact could not be found.");
});
