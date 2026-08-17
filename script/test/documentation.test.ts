import { describe, expect, it } from "vitest";
import type { TextFile } from "#lint/inventory.ts";
import { documentationViolations } from "#lint/rules/documentation.ts";

const document = (path: string, raw: string): TextFile => ({ path, raw });

const cleanDocuments = (): readonly TextFile[] => [
	document(
		"README.md",
		"# Antumbra\n\n[Design](DESIGN.md)\n[Architecture](ARCHITECTURE.md)\n[Glossary](GLOSSARY.md)\n[Guides](docs/design/README.md)\n",
	),
	document("DESIGN.md", "# Design axioms\n"),
	document("ARCHITECTURE.md", "# Architecture\n"),
	document(
		"GLOSSARY.md",
		"# Glossary\n\n## Work and planning\n\nOwner: [Work and planning](docs/design/work-and-planning.md)\n\n- [**Voyage**](docs/design/work-and-planning.md#voyages) — a ship under sail for an objective.\n",
	),
	document(
		"docs/design/README.md",
		"# Design guides\n\n- [Work and planning](work-and-planning.md)\n",
	),
	document(
		"docs/design/work-and-planning.md",
		"# Work and planning\n\n## Voyages\n",
	),
];

const hasRule = (documents: readonly TextFile[], rule: string): boolean =>
	documentationViolations(documents).some(
		(violation) => violation.rule === rule,
	);

describe("documentation rules", () => {
	it("accepts a linked and singly owned documentation set", () => {
		expect(documentationViolations(cleanDocuments())).toEqual([]);
	});

	it("flags broken relative links and missing anchors", () => {
		const documents = [
			...cleanDocuments(),
			document(
				"docs/design/broken.md",
				"[Missing](absent.md)\n[Anchor](work-and-planning.md#absent)\n",
			),
		];
		expect(hasRule(documents, "docs/relative-link")).toBe(true);
		expect(hasRule(documents, "docs/anchor")).toBe(true);
	});

	it("flags pages unreachable from the public README", () => {
		const documents = [
			...cleanDocuments(),
			document("docs/design/hidden.md", "# Hidden\n"),
		];
		expect(hasRule(documents, "docs/reachability")).toBe(true);
	});

	it("requires the design index to list every topic exactly once", () => {
		const documents = cleanDocuments().map((entry) =>
			entry.path === "docs/design/README.md"
				? document(
						entry.path,
						"# Design guides\n\n- [Work](work-and-planning.md)\n- [Again](work-and-planning.md)\n",
					)
				: entry,
		);
		expect(hasRule(documents, "docs/design-index")).toBe(true);
	});

	it("normalizes glossary terms before checking uniqueness", () => {
		const documents = cleanDocuments().map((entry) =>
			entry.path === "GLOSSARY.md"
				? document(
						entry.path,
						`${entry.raw}- [**voyage!**](docs/design/work-and-planning.md#voyages) — duplicate spelling.\n`,
					)
				: entry,
		);
		expect(hasRule(documents, "docs/glossary-term")).toBe(true);
	});

	it("requires one topic owner and routes every term to it", () => {
		const documents = cleanDocuments().map((entry) =>
			entry.path === "GLOSSARY.md"
				? document(
						entry.path,
						entry.raw.replace(
							"Owner: [Work and planning](docs/design/work-and-planning.md)",
							"Owner: [Work](docs/design/work-and-planning.md)\nOwner: [Other](docs/design/other.md)",
						),
					)
				: entry,
		);
		expect(hasRule(documents, "docs/glossary-owner")).toBe(true);
	});
});
