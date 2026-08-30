import { Effect, Layer, Stream } from "effect";
import type { FixtureFeeds } from "#fixtures/feeds.ts";
import { flagshipSummary, flagshipView } from "#fixtures/flagship.ts";
import {
	quayView,
	reefSummary,
	reefView,
	shoalWarning,
} from "#fixtures/voyage.ts";
import { SightFailure } from "#sight.ts";
import { VoyageSource } from "#voyages.ts";

const noSuchVoyage = (voyageId: string) =>
	new SightFailure({ message: `no such voyage: ${voyageId}` });

// why: the fleet's own voyage is on the list the window reads, so it answers
// when it is opened — a listed voyage that refuses to be read would be a
// fixture teaching the window a failure the host does not have.
const views = [reefView, flagshipView];

export const voyageFixture = (feeds: FixtureFeeds) =>
	Layer.succeed(VoyageSource, {
		adoptChange: (request) =>
			request.url === ""
				? new SightFailure({ message: "github refused: no such change" })
				: Effect.succeed({ ...shoalWarning, url: request.url }),
		artifactMarkdown: (artifactId) =>
			Effect.succeed({
				artifactId,
				byteSize: 15,
				digest: "0".repeat(64),
				markdown: "# The chart\n",
				title: "The chart",
			}),
		charterPiece: (request) =>
			Effect.succeed({ pieceId: `piece-for-${request.title}` }),
		dismissChange: () => Effect.void,
		hail: () => Effect.succeed({ agentId: "agent-hailed" }),
		landPieceVerdict: () => Effect.void,
		launch: () => Effect.void,
		open: (request) => Effect.succeed({ ...reefSummary, name: request.name }),
		park: () => Effect.void,
		quay: Effect.succeed(quayView),
		quayFeed: feeds.quay,
		refreshChanges: Effect.void,
		removeArtifactSupersession: () => Effect.void,
		reportMarkdown: (reportId) =>
			reportId === "report-soundings"
				? Effect.succeed({
						authorAgentId: "agent-sounder",
						markdown:
							"# Soundings\n\nThe eastern shoal is steeper than charted.",
						reportId,
						title: "Soundings",
					})
				: new SightFailure({ message: `no such report: ${reportId}` }),
		rewire: () => Effect.void,
		setCaptainBackend: () => Effect.void,
		setCrewBackend: () => Effect.void,
		setFocus: () => Effect.void,
		supersedeArtifact: () => Effect.void,
		unpark: () => Effect.void,
		voyage: (voyageId) => {
			const view = views.find((held) => held.id === voyageId);
			return view === undefined ? noSuchVoyage(voyageId) : Effect.succeed(view);
		},
		voyageFeed: (voyageId) => {
			if (voyageId === reefView.id) {
				return feeds.voyage;
			}
			const view = views.find((held) => held.id === voyageId);
			return view === undefined
				? Stream.fail(noSuchVoyage(voyageId))
				: Stream.make(view);
		},
		voyages: Effect.succeed([flagshipSummary, reefSummary]),
		voyagesFeed: feeds.voyages,
		workPieceNow: () => Effect.succeed({ agentId: "agent-crewed" }),
		writeBoard: () => Effect.void,
	});
