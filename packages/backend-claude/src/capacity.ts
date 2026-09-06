import type { BackendCapacityClassification } from "@antumbra/plugin-api";
import type { RawPayload } from "@antumbra/vocabulary/session-events.ts";
import { Option, Schema } from "effect";

const RateLimitType = Schema.Literals(["five_hour", "seven_day", "seven_day_opus", "seven_day_sonnet", "seven_day_overage_included", "overage"]);

const RateLimitEvent = Schema.Struct({
	rate_limit_info: Schema.Struct({
		rateLimitType: Schema.optional(RateLimitType),
		resetsAt: Schema.optional(Schema.Number),
		status: Schema.Literals(["allowed", "allowed_warning", "rejected"]),
		utilization: Schema.optional(Schema.Number),
	}),
	type: Schema.Literal("rate_limit_event"),
});

const decodeRateLimitEvent = Schema.decodeUnknownOption(Schema.fromJsonString(RateLimitEvent));

const windowLabel = (window: typeof RateLimitType.Type | undefined): string => (window === undefined ? "subscription" : window.replaceAll("_", "-"));

const limited = (info: typeof RateLimitEvent.Type.rate_limit_info, status: "blocked" | "warning"): BackendCapacityClassification => {
	const window = windowLabel(info.rateLimitType);
	return {
		detail: status === "blocked" ? `Claude ${window} usage limit reached` : `Claude ${window} usage is approaching its limit`,
		reason: "usage-limit",
		...(info.resetsAt === undefined ? {} : { resetsAt: info.resetsAt * 1_000 }),
		status,
		...(info.utilization === undefined ? {} : { utilization: info.utilization }),
	};
};

export const classifyClaudeCapacity = (raw: RawPayload): Option.Option<BackendCapacityClassification> => {
	if (raw.source !== "claude" || raw.kind !== "rate_limit_event") {
		return Option.none();
	}
	return Option.map(decodeRateLimitEvent(raw.payload), ({ rate_limit_info }) => {
		if (rate_limit_info.status === "allowed") {
			return { status: "available" as const };
		}
		return limited(rate_limit_info, rate_limit_info.status === "rejected" ? "blocked" : "warning");
	});
};
