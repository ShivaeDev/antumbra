# Simplicity

Every line of code is a permanent cost. It must be understood, tested,
changed, and paid for again by every agent who encounters it. The default is
therefore to delete or refuse complexity unless current evidence proves that it
pays rent.

This gate binds every coding and review agent. Apply it before the narrower
quality gates. A pattern described elsewhere does not justify using it when the
problem it solves is absent here. When a narrower gate conflicts with this one,
this gate controls and the narrower rule must be simplified.

Every code pull request receives an independent simplicity review. That
reviewer's sole job is to challenge unnecessary code, imagined failure modes,
contrived tests, and unjustified restrictions against this gate.

## Start with the real problem

1. Build the simplest model that satisfies the behavior in front of us. Do not
   model a stars-aligning scenario, a hypothetical future caller, or a failure
   that requires some other impossible failure first.
2. Make states unrepresentable when they are genuinely invalid domain states.
   Put those invariants in types and domain boundaries. If a state is merely
   odd but representable and has not caused a real problem, let it be. When it
   becomes a problem, fix the observed problem then.
3. Prefer one job, one owner, and one-way dependencies. Hexagonal architecture
   provides dependency inversion in one direction; it is not permission to add
   layers. Single responsibility means a unit does one understandable job; it
   is not permission to split that job across ceremony.
4. YAGNI and KISS are rejection criteria. An abstraction, branch, check,
   recovery path, option, or test without a current need does not ship.
5. Do not deny an agent or component an operation merely because a narrower
   policy sounds safer. Start permissive. Add a block only for a real product
   rule or an observed failure. Agents may read one another's Voyages unless a
   current product rule says otherwise.

## The threat model is almost empty

Antumbra is a local, cooperative application whose agents can already exercise
broad authority on the machine. Internet-service security posture does not
apply.

Do not add defenses for hostile agents, untrusted local users, path traversal,
local permissions, tenant isolation, adversarial inputs, or similar attacks.
Do not add permission gates simply to restrict something the application can
already do. Security hardening is out of scope unless the admiral explicitly
establishes a concrete threat model for a named external boundary. Agents do
not invent one during implementation or review.

## Refuse speculative reliability machinery

Database transactions do not ship by default. This is a local app; do not
invent concurrent writers, millisecond races, or partial-failure choreography
to justify one. Use the direct sequence of operations. A coding or review agent
cannot add a transaction on its own authority; only an explicit product ruling
for a named, reproduced integrity failure may permit one.

The same rule rejects speculative locks, retries, rollback systems, crash
recovery, defensive conditionals, duplicate-state repair, startup healing,
race handling, and elaborate migration machinery. Do not grow a one-time
migration into a permanent framework. Use the smallest stopgap that performs
the migration, then remove it when it has served its purpose.

Evidence establishes the problem, not the mechanism. A reproduced bug does
not itself justify a transaction, retry, lock, recovery framework, or more
branches. First simplify the sequence, state, or boundary.

An impossible or fantastically unlikely state is not an invariant. Do not add
a hundred conditionals forever to avoid the possibility of fixing one real bug
later.

## Tests prove ordinary behavior

Tests prove the behavior under test through its local cause and visible result.
They do not stage a drama around it.

- Do not test impossible, corrupted, or contrived states unless reproducing an
  observed bug requires that state.
- Do not simulate crashes, hostile inputs, races to the millisecond, or bizarre
  interleavings merely to prove recovery code could run.
- Do not use long sleeps, long timeouts, timing luck, or repeated polling to
  manufacture confidence.
- Do not build broad mocks or require deep knowledge of unrelated components.
  Use the real narrow boundary, or a focused fake only when the actual boundary
  is unavailable, expensive, or nondeterministic.
- Keep the proof proportional and causal. A test should fail when the behavior
  regresses and remain unchanged when unrelated internals move.
- Delete tests for scenarios that cannot happen or behavior the product no
  longer promises. Their maintenance cost is not coverage.

## Comments are exceptional

Code, names, types, and boundaries should carry the explanation. Comments are
allowed only when they preserve a constraint or external fact the code cannot
express. They do not narrate the implementation, restate the type system,
record review discussion, or speculate about future hazards.

The `why:` prefix is not a license for a comment and is not repository style.
Delete an unnecessary comment instead of prefixing it. Rewrite code that needs
a running commentary.

Source formatting should favor readable units over narrow wrapping. The
repository's direction is a 150-column line width; the mechanical formatter
configuration may adopt that direction separately.

## Leave touched code simpler

Broken windows reproduce. When changing code, apply the Boy Scout rule to the
related code already in hand: remove nearby speculative branches, needless
transactions, narration, dead abstractions, contrived tests, and backwards
dependencies that violate this gate.

This duty is bounded by the responsibility being changed. Do not turn a focused
pull request into a repository-wide rewrite or manufacture a refactor as a
condition of unrelated work. Clean the room you are already working in; open a
separate focused change when the repair has its own responsibility.

## Review checklist

Reject or simplify the change unless every answer below is satisfactory:

- What current behavior, genuine domain invariant, or concrete maintenance cost
  pays for each added line?
- Is every encoded invariant actually invalid in the domain, rather than odd,
  unlikely, or imagined?
- Could a type or the existing boundary remove the bad state instead of a
  runtime check?
- Did the change add a transaction, race defense, recovery path, retry,
  permission gate, security defense, or migration framework? If so, is there an
  explicit product ruling that permits that mechanism?
- Does each test prove the behavior under test causally, without contrived
  state, broad mocks, timing drama, or unrelated knowledge?
- Does each abstraction, option, Layer, package, and conditional have a current
  caller and one clear job?
- Can comments, branches, indirection, or tests be deleted while preserving the
  required behavior?
- Is the dependency direction still one-way, and did the touched area become
  simpler rather than merely differently elaborate?
- Did cleanup stay with the related responsibility instead of expanding into an
  unbounded rewrite?

When the evidence is uncertain, choose less code. Let a real bug teach us which
single guard is worth owning instead of paying forever for a hundred imagined
ones.
