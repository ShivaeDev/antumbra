import { parseJson } from "#lint/adapters/json.ts";
import type { Inventory, SourceFile } from "#lint/inventory.ts";
import type { Violation } from "#lint/violation.ts";

interface RegistryEntry {
	readonly file: string;
	readonly pragma: string;
}

const PRAGMA = "@ts-expect-error";

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
	file.comments.flatMap((comment) => {
		const detected = comment.content.includes(PRAGMA);
		const registered = registry.some(
			(entry) =>
				entry.file === file.path && comment.content.includes(entry.pragma),
		);
		return !detected || registered
			? []
			: [
					{
						file: file.path,
						line: comment.line,
						message: `uses "${PRAGMA}" without a registry entry. Every lint escape is enumerated, with a reason, in script/pragma-registry.json.`,
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
