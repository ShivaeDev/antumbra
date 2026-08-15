import { parseJson } from "#lint/adapters/json.ts";
import type { Inventory } from "#lint/inventory.ts";
import {
	findServiceParameters,
	type ServiceParameterDebt,
} from "#lint/rules/service-parameter-analysis.ts";
import type { Violation } from "#lint/violation.ts";

type BaselineEntry = Omit<ServiceParameterDebt, "line">;
type ParsedBaseline =
	| { readonly entries: readonly BaselineEntry[]; readonly valid: true }
	| { readonly valid: false; readonly violations: readonly Violation[] };

const RULE = "effect/service-parameter-debt";
const BASELINE_RULE = "effect/service-parameter-baseline";
const LEGACY_ROOT = "packages/domain/src/";

const isEntry = (value: unknown): value is BaselineEntry =>
	typeof value === "object" &&
	value !== null &&
	"callable" in value &&
	typeof value.callable === "string" &&
	"file" in value &&
	typeof value.file === "string" &&
	"parameter" in value &&
	typeof value.parameter === "string" &&
	"type" in value &&
	typeof value.type === "string" &&
	Object.keys(value).length === 4;

const keyOf = (entry: BaselineEntry): string =>
	JSON.stringify([entry.file, entry.callable, entry.parameter, entry.type]);

const occurrences = (
	entries: readonly BaselineEntry[],
): Map<string, number> => {
	const found = new Map<string, number>();
	for (const entry of entries)
		found.set(keyOf(entry), (found.get(keyOf(entry)) ?? 0) + 1);
	return found;
};

const invalidRegistry = (
	file: string,
	message: string,
): readonly Violation[] => [
	{
		file,
		line: undefined,
		message,
		rule: BASELINE_RULE,
	},
];

const parseRegistry = (raw: string, file: string): ParsedBaseline => {
	const parsed = parseJson(raw === "" ? "[]" : raw);
	return Array.isArray(parsed) &&
		parsed.every(isEntry) &&
		parsed.every((entry) => entry.file.startsWith(LEGACY_ROOT))
		? { entries: parsed, valid: true }
		: {
				valid: false,
				violations: invalidRegistry(
					file,
					`The service-parameter baseline must be a JSON array of exact file, callable, parameter, and type entries under the sole legacy root ${LEGACY_ROOT}. New packages have zero allowance.`,
				),
			};
};

export const serviceParameterViolations = (
	inventory: Inventory,
): readonly Violation[] => {
	const allowanceFile = "script/lint/service-parameter-allowance.json";
	const baselineFile = "script/lint/service-parameter-baseline.json";
	const allowance = parseRegistry(
		inventory.serviceParameterAllowance,
		allowanceFile,
	);
	if (!allowance.valid) return allowance.violations;
	const parsed = parseRegistry(
		inventory.serviceParameterBaseline,
		baselineFile,
	);
	if (!parsed.valid) return parsed.violations;
	const baseline = parsed.entries;
	const original = occurrences(allowance.entries);
	const expanded = baseline.filter((entry) => {
		const key = keyOf(entry);
		const remaining = original.get(key) ?? 0;
		if (remaining === 0) return true;
		original.set(key, remaining - 1);
		return false;
	});
	if (expanded.length > 0) {
		return invalidRegistry(
			baselineFile,
			`The active baseline contains ${expanded.length} entry or entries outside the frozen legacy allowance. A newly baselined domain parameter is still new debt; the allowance never changes.`,
		);
	}
	const current = findServiceParameters(inventory.sources);
	const allowed = occurrences(baseline);
	const observed = occurrences(current);
	const additions = current.flatMap((debt) => {
		const key = keyOf(debt);
		const remaining = allowed.get(key) ?? 0;
		if (remaining > 0) {
			allowed.set(key, remaining - 1);
			return [];
		}
		return [
			{
				file: debt.file,
				line: debt.line,
				message: `Parameter "${debt.parameter}" of "${debt.callable}" receives the service-bearing type "${debt.type}". Require services from Effect instead; new manual service parameters cannot enter the baseline.`,
				rule: RULE,
			},
		];
	});
	const stale = baseline.flatMap((entry) => {
		const key = keyOf(entry);
		const remaining = observed.get(key) ?? 0;
		if (remaining > 0) {
			observed.set(key, remaining - 1);
			return [];
		}
		return [
			{
				file: entry.file,
				line: undefined,
				message: `The baseline entry for "${entry.callable}" parameter "${entry.parameter}: ${entry.type}" no longer exists. Remove this stale entry; the debt ratchet only shrinks.`,
				rule: BASELINE_RULE,
			},
		];
	});
	return [...additions, ...stale];
};
