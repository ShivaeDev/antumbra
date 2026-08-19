import { Schema } from "effect";
import { ArtifactMarkdown } from "#artifact-views.ts";
import { type AppProcedure, surface } from "#router-procedure.ts";
import { VoyageSummary, VoyageView } from "#voyage-views.ts";
import {
	ArtifactSupersessionRequest,
	BoardWriteRequest,
	CharterPieceRequest,
	CharterReceipt,
	HailReceipt,
	OpenVoyageRequest,
	RewireRequest,
	VoyageSource,
} from "#voyages.ts";

const PieceRef = Schema.Struct({ pieceId: Schema.String });
const ArtifactRef = Schema.Struct({ artifactId: Schema.String });
const VoyageRef = Schema.Struct({ voyageId: Schema.String });

export const voyageRoutes = (procedure: AppProcedure) => ({
	artifactMarkdown: procedure
		.input(ArtifactRef)
		.output(ArtifactMarkdown)
		.query(function* (input) {
			const voyages = yield* VoyageSource;
			return yield* surface(voyages.artifactMarkdown(input.artifactId));
		}),
	charterPiece: procedure
		.input(CharterPieceRequest)
		.output(CharterReceipt)
		.mutation(function* (input) {
			const voyages = yield* VoyageSource;
			return yield* surface(voyages.charterPiece(input));
		}),
	focusVoyage: procedure
		.input(Schema.Struct({ focused: Schema.Boolean, voyageId: Schema.String }))
		.mutation(function* (input) {
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
	launchPiece: procedure.input(PieceRef).mutation(function* (input) {
		const voyages = yield* VoyageSource;
		yield* surface(voyages.launch(input.pieceId));
	}),
	openVoyage: procedure
		.input(OpenVoyageRequest)
		.output(VoyageSummary)
		.mutation(function* (input) {
			const voyages = yield* VoyageSource;
			return yield* surface(voyages.open(input));
		}),
	parkPiece: procedure.input(PieceRef).mutation(function* (input) {
		const voyages = yield* VoyageSource;
		yield* surface(voyages.park(input.pieceId));
	}),
	removeArtifactSupersession: procedure
		.input(ArtifactSupersessionRequest)
		.mutation(function* (input) {
			const voyages = yield* VoyageSource;
			yield* surface(voyages.removeArtifactSupersession(input));
		}),
	rewirePiece: procedure.input(RewireRequest).mutation(function* (input) {
		const voyages = yield* VoyageSource;
		yield* surface(voyages.rewire(input));
	}),
	unparkPiece: procedure.input(PieceRef).mutation(function* (input) {
		const voyages = yield* VoyageSource;
		yield* surface(voyages.unpark(input.pieceId));
	}),
	supersedeArtifact: procedure
		.input(ArtifactSupersessionRequest)
		.mutation(function* (input) {
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
	voyagesFeed: procedure
		.output(Schema.Array(VoyageSummary))
		.subscription(function* () {
			const voyages = yield* VoyageSource;
			return voyages.voyagesFeed;
		}),
	writeBoard: procedure.input(BoardWriteRequest).mutation(function* (input) {
		const voyages = yield* VoyageSource;
		yield* surface(voyages.writeBoard(input));
	}),
});
