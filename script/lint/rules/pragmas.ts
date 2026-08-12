import { parseJson } from "#lint/adapters/json.ts";
import type { Inventory, SourceFile } from "#lint/inventory.ts";
import ruleData from "#lint/rules/rule-patterns.json" with { type: "json" };
import type { Violation } from "#lint/violation.ts";

interface RegistryEntry {
	readonly file: string;
	readonly pragma: string;
}

const DETECTOR = new RegExp(ruleData.pragmaDetector);

const isRegistryEntry = (value: unknown): value is RegistryEntry =>
	typeof value === "object" &&
	value !== null &&
	"file" in value &&
	"pragma" in value &&
	typeof value.file === "string" &&
	typeof value.pragma === "string";

const registryOf = (raw: string): readonly RegistryEntry[] => {
	const parsed = parseJson(raw);
	return Array.isArray(parsed) ? parsed.filter(isRegistryEntry) : [];
};

const fileViolations = (
	file: SourceFile,
	registry: readonly RegistryEntry[],
): readonly Violation[] =>
	file.lines.flatMap((text, index) => {
		const match = DETECTOR.exec(text);
		const registered = registry.some(
			(entry) => entry.file === file.path && text.includes(entry.pragma),
		);
		return match === null || registered
			? []
			: [
					{
						file: file.path,
						line: index + 1,
						message: `uses "${match[0]}" without a registry entry. Every lint escape is enumerated, with a reason, in script/pragma-registry.json.`,
						rule: "pragmas/unregistered",
					},
				];
	});

export const pragmaViolations = (
	inventory: Inventory,
): readonly Violation[] => {
	const registry = registryOf(inventory.pragmaRegistry);
	return inventory.sources.flatMap((file) => fileViolations(file, registry));
};
