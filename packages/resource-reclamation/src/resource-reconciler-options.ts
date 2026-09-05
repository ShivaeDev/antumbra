import { Context } from "effect";

export interface ResourceReconcileOptions {
	readonly cadenceMillis: number;
}

export const defaultResourceReconcileOptions: ResourceReconcileOptions = {
	cadenceMillis: 300_000,
};

export class ResourceReconcilerOptions extends Context.Service<ResourceReconcilerOptions, ResourceReconcileOptions>()(
	"@antumbra/resource-reclamation/ResourceReconcilerOptions",
) {}
