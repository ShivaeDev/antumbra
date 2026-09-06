import { basename, type Inventory, isDeclaration, type SourceFile } from "#lint/inventory.ts";
import type { Violation } from "#lint/violation.ts";
import { workspacePackages } from "#lint/workspace.ts";

const MAX_SOURCE_LINES = 150;
const MAX_TEST_LINES = 300;
const TEST_FILE = /\.(test|spec)\.tsx?$/;
const BARREL_FILE = /^index\.tsx?$/;

const packageEntries = (inventory: Inventory): ReadonlySet<string> =>
	new Set(workspacePackages(inventory).flatMap(({ root }) => [`${root}/src/index.ts`, `${root}/src/index.tsx`]));

const lineLimit = (file: SourceFile): number =>
	TEST_FILE.test(basename(file.path)) || file.path.includes("/test/") ? MAX_TEST_LINES : MAX_SOURCE_LINES;

const sizeViolations = (file: SourceFile): readonly Violation[] => {
	const limit = lineLimit(file);
	return file.lines.length <= limit
		? []
		: [
				{
					file: file.path,
					line: undefined,
					message: `${file.lines.length} lines exceeds the ${limit}-line limit. Split it along its responsibilities; never golf it under the cap.`,
					rule: "structure/max-lines",
				},
			];
};

const barrelViolations = (file: SourceFile, entries: ReadonlySet<string>): readonly Violation[] =>
	!BARREL_FILE.test(basename(file.path)) || entries.has(file.path)
		? []
		: [
				{
					file: file.path,
					line: undefined,
					message:
						"index.ts barrels are banned outside the package entry (src/index.ts). Name the module after its purpose and import it explicitly.",
					rule: "structure/no-barrel",
				},
			];

export const structureViolations = (inventory: Inventory): readonly Violation[] => {
	const entries = packageEntries(inventory);
	return inventory.sources
		.filter((file) => !isDeclaration(file.path))
		.flatMap((file) => [...sizeViolations(file), ...barrelViolations(file, entries)]);
};
