export const BACKEND_DEFAULT = "Backend default";

export const FLEET: Readonly<Record<string, string>> = { backend: "Default", effort: BACKEND_DEFAULT, model: BACKEND_DEFAULT };

export interface Inherited {
	readonly backend: string | null;
	readonly effort: string | null;
	readonly model: string | null;
	readonly role: string;
}

const inheritedAt = (rows: readonly Inherited[], role: string): Inherited | undefined => rows.find((row) => row.role === role);

export const voyagePlaceholders = (rows: readonly Inherited[], role: string): Readonly<Record<string, string>> => {
	const fleet = inheritedAt(rows, role);
	return {
		backend: fleet?.backend === undefined || fleet.backend === null ? "Fleet default" : `Fleet default (${fleet.backend})`,
		effort: fleet?.effort ?? BACKEND_DEFAULT,
		model: fleet?.model ?? BACKEND_DEFAULT,
	};
};
