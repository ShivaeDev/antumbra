import { Schema } from "effect";
import { section } from "#prose.ts";

const Berth = Schema.Struct({
	branch: Schema.String,
	folder: Schema.String,
	repo: Schema.String,
});

export const Berthing = Schema.Struct({
	berths: Schema.Array(Berth),
	moorageRoot: Schema.NullOr(Schema.String),
});
export type Berthing = typeof Berthing.Type;

const CREW_ORDERS = [
	"Each berth is already on the work branch shown beside it. Work in the berth folder. Never create or switch branches.",
	"Never open a pull request with `gh` or the GitHub UI. `open_change` opens it from the branch the berth is on.",
].join("\n\n");

const CAPTAIN_ORDERS = "Use the repository names above when chartering work.";

const berthLine = (berth: typeof Berth.Type): string => `${berth.repo} — ${berth.folder} — branch ${berth.branch}`;

export const berthsSection = (input: Berthing, role: "captain" | "crew"): ReadonlyArray<string> => {
	if (input.moorageRoot === null) return [];
	const lines = [
		`Working directory: ${input.moorageRoot}`,
		`Scratch folder: ${input.moorageRoot}/scratch — write notes and drafts here; nothing in it is ever committed.`,
	];
	if (input.berths.length > 0) {
		lines.push(...input.berths.map(berthLine), "", role === "captain" ? CAPTAIN_ORDERS : CREW_ORDERS);
	}
	return section("Berths", lines.join("\n"));
};
