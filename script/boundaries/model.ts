export type WorkspaceRoot = "apps" | "packages";

export type ImportTarget =
	| {
			readonly kind: "all-applications" | "all-packages";
	  }
	| {
			readonly kind: "any";
			readonly selectors: readonly ImportTarget[];
	  }
	| {
			readonly kind: "application" | "package";
			readonly names: readonly string[];
	  }
	| {
			readonly kind: "external-module" | "external-namespace";
			readonly name: string;
	  }
	| {
			readonly family: string;
			readonly kind: "package-family";
	  };

export type ImportSource =
	| ImportTarget
	| {
			readonly excludedPackages: readonly string[];
			readonly kind: "workspace-except";
	  };

export type FixtureEndpoint =
	| {
			readonly kind: "external-module";
			readonly name: string;
	  }
	| {
			readonly kind: "workspace-file";
			readonly path: string;
	  };

export type WorkspaceFixtureEndpoint = Extract<
	FixtureEndpoint,
	{ readonly kind: "workspace-file" }
>;

export interface FixtureEdge {
	readonly from: WorkspaceFixtureEndpoint;
	readonly to: FixtureEndpoint;
}

export interface RuleExamples {
	readonly illegal: FixtureEdge;
	readonly legal: FixtureEdge;
}

interface PolicyRuleBase {
	readonly examples: RuleExamples;
	readonly name: string;
	readonly rationale: string;
}

export interface NegativeFence extends PolicyRuleBase {
	readonly from: ImportSource;
	readonly kind: "negative-fence";
	readonly to: ImportTarget;
}

export interface VocabularyAccess extends PolicyRuleBase {
	readonly allowedSubjects: readonly string[];
	readonly consumers: ImportSource;
	readonly kind: "vocabulary-access";
}

export type BoundaryRule = NegativeFence | VocabularyAccess;
