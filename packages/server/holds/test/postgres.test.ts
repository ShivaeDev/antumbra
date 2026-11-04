import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import { VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { expect } from "vitest";

postgresApp.it(
	"replays held work and derives its gates from committed rulings",
	[],
	function* ({ journal, replayJournal, api, holdWrite, rollback, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.voyages.open({
			requestId: Request.make("voyage"),
			name: "Reef",
			context: "Sound",
			northStar: "Safe passage",
			kind: "voyage",
			captainBackend: null,
			captainModel: null,
			captainEffort: null,
			crewBackend: null,
			crewModel: null,
			crewEffort: null,
		});
		yield* legacy.api.pieces.charter({
			requestId: Request.make("piece"),
			voyageId: VoyageId.make("voyage"),
			title: "Sound",
			charter: "Passage",
			expectation: "Chart",
			role: "hand",
			dependsOn: [],
		});
		yield* legacy.api.pieces.launch({ id: PieceId.make("piece") });
		yield* legacy.api.settings.setFlag({ key: "spawnForPiece", on: false });
		yield* replayJournal(legacy);
		const queues = yield* api["holds.queues"]({});
		expect(queues).toEqual(yield* answered(legacy.api.holds.queues({}), "journal queues"));
		const held = yield* holdWrite(
			api["rulings.request"]({
				requestId: Request.make("gate"),
				requester: { kind: "authority", by: "admiral" },
				rung: "admiral",
				question: "Which passage?",
				context: "Rocks",
				radius: "piece",
				urgency: "blocking",
				choices: [],
				subjects: [],
				gates: [PieceId.make("piece")],
				recommendation: null,
			}),
		);
		expect(yield* api["holds.queues"]({})).toEqual(queues);
		yield* held.commit();
		expect((yield* api["holds.queues"]({})).queues).toMatchObject([{ setting: "spawnForPiece", waiting: [] }]);
		const gated = yield* api["holds.queues"]({});
		yield* rollback(api["settings.setFlag"]({ requestId: Request.make("release"), key: "spawnForPiece", on: true }));
		expect(yield* api["holds.queues"]({})).toEqual(gated);
		yield* rebuild();
		expect(yield* api["holds.queues"]({})).toEqual(gated);
	},
);
