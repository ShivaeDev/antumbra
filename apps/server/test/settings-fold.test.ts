import { legacyFacts } from "@antumbra/app-testing/legacy.ts";
import { expect } from "vitest";

const flag = (key: string, on: boolean) => ({ name: "FlagSet", payload: { key, on } });
legacyFacts.it("folds legacy dispatch and wake holds into their SQL switches", [], function* ({ seed, flags }) {
	yield* seed([flag("holdPieceDispatch", true), flag("holdWakes", true)]);
	expect(yield* flags()).toEqual([
		{ key: "resumePieces", on: false },
		{ key: "spawnForPiece", on: false },
		{ key: "wakeOnFlashMail", on: false },
		{ key: "wakeOnHail", on: false },
		{ key: "wakeOnPriorityMail", on: false },
		{ key: "wakeOnRoutineMail", on: false },
	]);
});
legacyFacts.it("folds released legacy holds and preserves unrelated switches", [], function* ({ seed, flags }) {
	yield* seed([flag("holdPieceDispatch", false), flag("holdWakes", false), flag("retireSweep", false)]);
	expect(yield* flags()).toEqual([
		{ key: "resumePieces", on: true },
		{ key: "retireSweep", on: false },
		{ key: "spawnForPiece", on: true },
		{ key: "wakeOnFlashMail", on: true },
		{ key: "wakeOnHail", on: true },
		{ key: "wakeOnPriorityMail", on: true },
		{ key: "wakeOnRoutineMail", on: true },
	]);
});
legacyFacts.it("drops the removed legacy signature flag from folded facts and SQL state", [], function* ({ seed, flags, facts }) {
	yield* seed([flag("signChanges", false), flag("retireSweep", false)]);
	expect(yield* flags()).toEqual([{ key: "retireSweep", on: false }]);
	expect((yield* facts()).map((fact) => fact.payload)).toEqual([{ keys: ["retireSweep"], on: false }]);
});
