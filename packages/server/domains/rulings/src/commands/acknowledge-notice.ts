import { command } from "@antumbra/platform-feature/command.ts";
import { rulingNoticeDelivered } from "#facts/ruling-notice-delivered.ts";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const acknowledgeNotice = command("acknowledgeNotice", {
	input: rulingNoticeDelivered.payload,
	reads: [ruling],
	emits: rulingNoticeDelivered,
	rejections: { Unknown: { rulingId: RulingId } },
});
