import { open } from "@antumbra/domain-voyages/commands/open.ts";
import { quiet } from "@antumbra/domain-voyages/commands/quiet.ts";
import { resume } from "@antumbra/domain-voyages/commands/resume.ts";
import { setFocus } from "@antumbra/domain-voyages/commands/set-focus.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { voyageProgress } from "@antumbra/domain-voyages/rows/voyage-progress.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, stream } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";

const rows = collection("voyage", VoyageId);
const roleRows = collection("roleSetting", Schema.String, { scope: Schema.String });
const progressRows = collection("voyageProgress", VoyageId);

export const Open = command("open", {
	payload: open.Input,
	success: Schema.Number,
	rejections: open.Rejection,
	invalidates: (input) => [rows.list, roleRows.bucket.scope(input.requestId), progressRows.list],
});
export const SetFocus = command("setFocus", {
	payload: setFocus.Input,
	success: Schema.Number,
	rejections: setFocus.Rejection,
	invalidates: () => [rows.list],
});
export const Quiet = command("quiet", { payload: quiet.Input, success: Schema.Number, rejections: quiet.Rejection, invalidates: () => [rows.list] });
export const Resume = command("resume", {
	payload: resume.Input,
	success: Schema.Number,
	rejections: resume.Rejection,
	invalidates: () => [rows.list],
});
export const ById = stream("byId", {
	payload: { id: VoyageId },
	success: Schema.NullOr(voyage.Row),
	reads: () => [rows.list],
});
export const List = stream("list", { payload: {}, success: Schema.Array(voyage.Row), reads: () => [rows.list] });
export const Progress = stream("progress", {
	payload: { id: VoyageId },
	success: Schema.NullOr(voyageProgress.Row),
	reads: () => [progressRows.list],
});

export const VoyagesContract = contract("voyages", { commands: [Open, SetFocus, Quiet, Resume], streams: [ById, List, Progress] });
