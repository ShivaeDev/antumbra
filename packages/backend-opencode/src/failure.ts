import { BackendFailure } from "@antumbra/plugin-api";

const describe = (detail: unknown): string =>
	typeof detail === "object" && detail !== null && "message" in detail && typeof detail.message === "string" ? detail.message : String(detail);

export const opencodeFailure = (detail: unknown): BackendFailure => new BackendFailure({ detail: describe(detail), tag: "opencode" });
