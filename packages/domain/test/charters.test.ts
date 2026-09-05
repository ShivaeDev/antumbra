import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Option } from "effect";
import { deliveredCharter } from "#test/charter-fixture.ts";
import { onPiece, ruled, seedAsker, unruled } from "#test/ruling-fixtures.ts";
import { openReefVoyage } from "#test/voyage-fixtures.ts";

it.effectApp("a dispatched crew is told both registers of its boards", function* ({ scripted }) {
	const pieces = yield* Pieces;
	const boards = yield* Boards;
	const reef = yield* openReefVoyage;
	const alpha = yield* pieces.charter({
		charter: "sound the shallows",
		dependsOn: [],
		expectation: "soundings are landed",
		role: "hand",
		title: "alpha",
		voyageId: reef.id,
	});
	const wrote = (body: string, register: "rough" | "smooth") =>
		boards.write(BoardScope.Voyage({ voyageId: reef.id }), EntryInput.Note({ authorAgentId: Option.none(), body, register }));
	yield* wrote("the eastern approach is safe", "smooth");
	yield* wrote("the swell is running", "rough");
	yield* boards.write(
		BoardScope.Piece({ pieceId: alpha.id }),
		EntryInput.Note({
			authorAgentId: Option.none(),
			body: "the last hand reached the reef edge",
			register: "smooth",
		}),
	);
	yield* pieces.launch(alpha.id);

	const { text: charter } = yield* deliveredCharter(scripted, alpha.id);
	expect(charter).toContain("the eastern approach is safe");
	expect(charter).toContain("the last hand reached the reef edge");
	expect(charter).toContain("the swell is running");
});

it.effectApp("a dispatched crew is told the standing rulings that bind it", function* ({ scripted }) {
	const pieces = yield* Pieces;
	const reef = yield* openReefVoyage;
	const charter = (title: string) =>
		pieces.charter({
			charter: `do ${title}`,
			dependsOn: [],
			expectation: `${title} is landed`,
			role: "hand",
			title,
			voyageId: reef.id,
		});
	const alpha = yield* charter("alpha");
	const bravo = yield* charter("bravo");
	yield* seedAsker;
	yield* ruled("which reading do we trust?", "trust the soundings", {
		radius: "fleet",
		subjects: [],
	});
	yield* ruled("may alpha dredge the reef?", "no", {
		radius: "piece",
		subjects: onPiece(alpha.id),
	});
	yield* unruled("may alpha anchor overnight?", {
		radius: "piece",
		subjects: onPiece(alpha.id),
	});
	yield* ruled("may bravo dredge the reef?", "yes", {
		radius: "piece",
		subjects: onPiece(bravo.id),
	});
	yield* pieces.launch(alpha.id);

	const { text: charterText } = yield* deliveredCharter(scripted, alpha.id);
	expect(charterText).toContain("# Standing rulings");
	expect(charterText).toContain("which reading do we trust? — trust the soundings");
	expect(charterText).toContain("may alpha dredge the reef? — no");
	expect(charterText).not.toContain("anchor overnight");
	expect(charterText).not.toContain("may bravo dredge");
});
