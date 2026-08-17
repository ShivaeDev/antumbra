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

const replaceDocument = (
	documents: readonly TextFile[],
	path: string,
	rewrite: (raw: string) => string,
): readonly TextFile[] =>
	documents.map((entry) =>
		entry.path === path ? document(path, rewrite(entry.raw)) : entry,
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

	it("ignores Markdown links demonstrated inside code", () => {
		const documents = replaceDocument(
			cleanDocuments(),
			"DESIGN.md",
			(raw) =>
				`${raw}\n\`[Inline](missing.md)\`\n\n\`\`\`md\n[Fenced](absent.md#gone)\n\`\`\`\n`,
		);
		expect(documentationViolations(documents)).toEqual([]);
	});

	it("resolves reference-style Markdown links", () => {
		let documents = replaceDocument(
			cleanDocuments(),
			"README.md",
			() =>
				"# Antumbra\n\n[Design][design]\n[Architecture][architecture]\n[Glossary][glossary]\n[Guides][guides]\n\n[design]: DESIGN.md\n[architecture]: ARCHITECTURE.md\n[glossary]: GLOSSARY.md\n[guides]: docs/design/README.md\n",
		);
		documents = replaceDocument(
			documents,
			"docs/design/README.md",
			() =>
				"# Design guides\n\n- [Work and planning][work]\n\n[work]: work-and-planning.md\n",
		);
		expect(documentationViolations(documents)).toEqual([]);
	});

	it("validates the destinations of reference-style links", () => {
		const documents = replaceDocument(
			cleanDocuments(),
			"README.md",
			() => "# Antumbra\n\n[Design][design]\n\n[design]: absent.md\n",
		);
		expect(hasRule(documents, "docs/relative-link")).toBe(true);
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

	it("rejects malformed glossary term rows", () => {
		const documents = replaceDocument(cleanDocuments(), "GLOSSARY.md", (raw) =>
			raw.replace(
				"- [**Voyage**](docs/design/work-and-planning.md#voyages) — a ship under sail for an objective.",
				"- **Voyage** — a ship under sail for an objective.",
			),
		);
		expect(hasRule(documents, "docs/glossary-row")).toBe(true);
	});

	it("requires a glossary owner under docs/design", () => {
		const documents = replaceDocument(
			cleanDocuments(),
			"GLOSSARY.md",
			() =>
				"# Glossary\n\n## Work and planning\n\nOwner: [Design](DESIGN.md)\n\n- [**Voyage**](DESIGN.md#design-axioms) — a ship under sail for an objective.\n",
		);
		expect(hasRule(documents, "docs/glossary-owner")).toBe(true);
	});

	it("requires an owner even when a glossary group has no valid rows", () => {
		const documents = replaceDocument(cleanDocuments(), "GLOSSARY.md", (raw) =>
			raw.replace(/^Owner: .*\n\n/m, ""),
		);
		expect(hasRule(documents, "docs/glossary-owner")).toBe(true);
	});

	it("rejects a term routed to a different topic than its owner", () => {
		const documents = replaceDocument(cleanDocuments(), "GLOSSARY.md", (raw) =>
			raw.replace(
				"docs/design/work-and-planning.md#voyages) — a ship",
				"docs/design/README.md#design-guides) — a ship",
			),
		);
		expect(hasRule(documents, "docs/glossary-owner")).toBe(true);
	});
});
