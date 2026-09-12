import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { report } from "#rows/report.ts";

export const reportLanded = fact("ReportLanded", { ...report.fields, pieceId: PieceId });
