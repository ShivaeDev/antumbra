import { Schema } from "effect";
import { ArtifactMarkdown } from "#artifact-views.ts";
import { type AppProcedure, surface } from "#router-procedure.ts";
import { ArtifactSupersessionRequest, CrewReceipt, HailReceipt } from "#voyage-requests.ts";
import { ReportMarkdown, VoyageSummary, VoyageView } from "#voyage-views.ts";
import { VoyageSource } from "#voyages.ts";

const PieceRef = Schema.Struct({ pieceId: Schema.String });
const ArtifactRef = Schema.Struct({ artifactId: Schema.String });
const ReportRef = Schema.Struct({ reportId: Schema.String });
const VoyageRef = Schema.Struct({ voyageId: Schema.String });

export const voyageRoutes = (procedure: AppProcedure) => ({
	artifactMarkdown: procedure
		.input(ArtifactRef)
		.output(ArtifactMarkdown)
		.query(function* (input) {
			const voyages = yield* VoyageSource;
			return yield* surface(voyages.artifactMarkdown(input.artifactId));
		}),
	focusVoyage: procedure.input(Schema.Struct({ focused: Schema.Boolean, voyageId: Schema.String })).mutation(function* (input) {
		const voyages = yield* VoyageSource;
		yield* surface(voyages.setFocus(input.voyageId, input.focused));
	}),
	hailCaptain: procedure
		.input(VoyageRef)
		.output(HailReceipt)
		.mutation(function* (input) {
			const voyages = yield* VoyageSource;
			return yield* surface(voyages.hail(input.voyageId));
		}),
	removeArtifactSupersession: procedure.input(ArtifactSupersessionRequest).mutation(function* (input) {
		const voyages = yield* VoyageSource;
		yield* surface(voyages.removeArtifactSupersession(input));
	}),
	reportMarkdown: procedure
		.input(ReportRef)
		.output(ReportMarkdown)
		.query(function* (input) {
			const voyages = yield* VoyageSource;
			return yield* surface(voyages.reportMarkdown(input.reportId));
		}),
	smoothBoard: procedure.input(VoyageRef).mutation(function* (input) {
		const voyages = yield* VoyageSource;
		yield* surface(voyages.smoothBoard(input.voyageId));
	}),
	supersedeArtifact: procedure.input(ArtifactSupersessionRequest).mutation(function* (input) {
		const voyages = yield* VoyageSource;
		yield* surface(voyages.supersedeArtifact(input));
	}),
	voyage: procedure
		.input(VoyageRef)
		.output(VoyageView)
		.query(function* (input) {
			const voyages = yield* VoyageSource;
			return yield* surface(voyages.voyage(input.voyageId));
		}),
	voyageFeed: procedure
		.input(VoyageRef)
		.output(VoyageView)
		.subscription(function* (input) {
			const voyages = yield* VoyageSource;
			return voyages.voyageFeed(input.voyageId);
		}),
	voyages: procedure.output(Schema.Array(VoyageSummary)).query(function* () {
		const voyages = yield* VoyageSource;
		return yield* surface(voyages.voyages);
	}),
	voyagesFeed: procedure.output(Schema.Array(VoyageSummary)).subscription(function* () {
		const voyages = yield* VoyageSource;
		return voyages.voyagesFeed;
	}),
	workPieceNow: procedure
		.input(PieceRef)
		.output(CrewReceipt)
		.mutation(function* (input) {
			const voyages = yield* VoyageSource;
			return yield* surface(voyages.workPieceNow(input.pieceId));
		}),
});
