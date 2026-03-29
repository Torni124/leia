import { findSection, isFieldSection, type FieldEntry, type Section, type SourceFile } from "./ast";

export const PROMPT_STYLES = [
  "strict",
  "acceptance"
] as const;

export type PromptStyle = (typeof PROMPT_STYLES)[number];

export interface PromptRenderOptions {
  readonly includeSourceAppendix?: boolean;
  readonly style?: PromptStyle;
}

interface CompiledPromptBrief {
  readonly kind: string;
  readonly name: string;
  readonly targetText: string;
  readonly platform: string | null;
  readonly runtime: string | null;
  readonly inputs: readonly string[];
  readonly state: readonly string[];
  readonly outputs: readonly string[];
  readonly rules: readonly string[];
  readonly constraints: readonly string[];
  readonly preferences: readonly string[];
  readonly flex: readonly string[];
  readonly tests: readonly string[];
}

export function isPromptStyle(text: string): text is PromptStyle {
  return PROMPT_STYLES.includes(text as PromptStyle);
}

export function renderPrompt(
  sourceFile: SourceFile,
  options: PromptRenderOptions = {}
): string {
  const root = sourceFile.root;

  if (!root) {
    return "";
  }

  const brief = compilePromptBrief(sourceFile);
  const style = options.style ?? "strict";
  const promptSections = renderPromptByStyle(brief, style);

  if (options.includeSourceAppendix) {
    promptSections.push("", "Compiled Leia Source Appendix:", renderSourceAppendix(sourceFile));
  }

  return promptSections.join("\n").trimEnd();
}

function renderPromptByStyle(
  brief: CompiledPromptBrief,
  style: PromptStyle
): string[] {
  switch (style) {
    case "strict":
      return renderStrictPrompt(brief);
    case "acceptance":
      return renderAcceptancePrompt(brief);
    default:
      return renderStrictPrompt(brief);
  }
}

function renderStrictPrompt(brief: CompiledPromptBrief): string[] {
  return [
    `You are a coding model implementing a ${brief.kind} from a strict compiled Leia contract.`,
    "",
    "Priority Order:",
    "1. Hard constraints and any explicit signatures, CLI contracts, exported names, or output shapes.",
    "2. Required behavior.",
    "3. Acceptance criteria.",
    "4. Soft preferences.",
    "5. Explicit flexible areas when declared; otherwise use conservative conventional defaults.",
    "",
    "Forbidden Failure Modes:",
    "- Do not omit, rename, or weaken any explicitly required export, signature, CLI contract, or output shape.",
    "- Do not violate any hard constraint even if a preference suggests otherwise.",
    "- Do not introduce undeclared dependencies, frameworks, or side effects that conflict with the brief.",
    "- Do not add behavior that conflicts with required behavior or acceptance criteria.",
    "- Do not return explanations, Markdown fences, or partial solutions.",
    "",
    "Working Method:",
    "1. Internally extract all required interfaces, behaviors, constraints, and acceptance checks.",
    "2. Internally choose the best implementation you can produce within the contract, not merely the first implementation that seems to pass.",
    "3. Use preferences only when they do not conflict with higher-priority requirements.",
    "4. Improve clarity, robustness, maintainability, and testability whenever doing so does not conflict with the contract.",
    "5. Prefer conventional language and standard-library idioms over novel structure when multiple designs satisfy the contract.",
    "6. Prefer a stable, low-variance implementation shape: straightforward helper decomposition, unsurprising names, deterministic control flow, and no optional abstractions unless they clearly improve the result.",
    "7. When flexible areas are declared, keep discretionary variation inside them. When they are not declared, choose conservative defaults and avoid stylistic experimentation.",
    "8. Keep the surface area as small as possible while still producing the strongest implementation you can within the contract.",
    "",
    "Contract-Bounded Quality Rules:",
    "- Optimize for correctness first, then for code quality.",
    "- Prefer clear structure, explicit error handling, sensible decomposition, maintainable code, and complete CLI/help contracts when those improvements fit within the contract.",
    "- Prefer stable, conventional, low-variance implementation choices over cleverness, personalization, or architectural flourish.",
    "- Do not weaken or change required behavior, hard constraints, signatures, CLI contracts, or output shapes in pursuit of refactoring.",
    "- Do not add speculative features, alternate execution paths, or architectural complexity that the contract does not justify.",
    "",
    "Final Review Before Responding:",
    "1. Perform a final internal review before responding.",
    "2. Review the implementation against each acceptance criterion one by one.",
    "3. Check that every required behavior is implemented.",
    "4. Check that no hard constraint is violated.",
    "5. Check that required function names, signatures, CLI flags, output fields, and exit-code behavior match exactly.",
    "6. Check that validation failures return a non-zero exit code and do not write the output file when the brief implies that contract.",
    "7. After the contract checks pass, make any additional low-risk quality improvements that keep the implementation within the contract and reduce unnecessary variation.",
    "8. If any check fails, revise the implementation before responding.",
    "9. Do not respond until you believe the implementation would pass the acceptance tests and reflects strong engineering judgment within the contract.",
    "10. Output only the final implementation artifact.",
    "",
    ...renderSharedBriefSections(brief)
  ];
}

function renderAcceptancePrompt(brief: CompiledPromptBrief): string[] {
  return [
    `You are a coding model implementing a ${brief.kind} from a compiled Leia brief.`,
    "",
    "Acceptance Gate:",
    "- The implementation is incomplete unless every acceptance criterion is satisfied.",
    "- When the brief is ambiguous, choose the simplest implementation that satisfies the acceptance criteria without violating hard constraints.",
    "- Optimize first for externally observable correctness, then improve code quality as much as possible without violating the contract.",
    "- When multiple implementations satisfy the brief, prefer the most conventional, low-variance design with the smallest stable surface area.",
    "- Use explicit flexible areas for discretionary choices when they are declared. Otherwise choose conservative defaults and avoid stylistic experimentation.",
    "",
    "Final Review Before Responding:",
    "- Review the implementation against each acceptance criterion one by one.",
    "- Check that every required behavior is implemented.",
    "- Check that no hard constraint is violated.",
    "- Check that required function names, signatures, CLI flags, output fields, and exit-code behavior match exactly.",
    "- Check that validation failures return a non-zero exit code and do not write the output file when the brief implies that contract.",
    "- After those contract checks pass, improve clarity, robustness, maintainability, and testability wherever those improvements stay within the contract and reduce unnecessary variation.",
    "- Prefer conventional language/library idioms, straightforward helper structure, explicit data flow, and deterministic behavior.",
    "- Do not add speculative features, unnecessary complexity, or stylistic flourishes in the name of improvement.",
    "- If any check fails, revise the implementation before responding.",
    "- Do not respond until you believe the implementation would pass the acceptance tests and reflects strong engineering judgment within the contract.",
    "",
    "Behavioral Priorities:",
    "1. Observable outputs and side effects required by the acceptance criteria.",
    "2. Required behavior.",
    "3. Hard constraints.",
    "4. Preferences.",
    "",
    ...renderSharedBriefSections(brief, { testsFirst: true })
  ];
}

function renderSharedBriefSections(
  brief: CompiledPromptBrief,
  options: { testsFirst?: boolean } = {}
): string[] {
  const sections: string[] = [
    "Project:",
    `- Kind: ${brief.kind}`,
    `- Name: ${brief.name}`,
    `- Target: ${brief.targetText}`,
    "",
    "Deliverable:",
    ...renderDeliverableRequirements(brief),
    "",
    renderFieldSection("Inputs", brief.inputs),
    "",
    renderFieldSection("State", brief.state),
    "",
    renderFieldSection("Outputs", brief.outputs)
  ];

  if (options.testsFirst) {
    sections.push(
      "",
      renderTextSection("Acceptance Criteria", brief.tests, [
        "No explicit acceptance tests were provided."
      ]),
      "",
      renderTextSection("Required Behavior", brief.rules, [
        "No explicit required behavior was provided beyond the structural contract."
      ])
    );
  } else {
    sections.push(
      "",
      renderTextSection("Required Behavior", brief.rules, [
        "No explicit required behavior was provided beyond the structural contract."
      ]),
      "",
      renderTextSection("Acceptance Criteria", brief.tests, [
        "No explicit acceptance tests were provided."
      ])
    );
  }

  sections.push(
    "",
    renderTextSection("Hard Constraints", brief.constraints, [
      "No explicit hard constraints were provided beyond the structural contract."
    ]),
    "",
    renderTextSection("Soft Preferences", brief.preferences, [
      "No additional soft preferences were provided."
    ]),
    "",
    renderTextSection("Flexible Areas", brief.flex, [
      "No explicit flexible areas were declared. Prefer conservative conventional implementation choices with minimal variation."
    ]),
    "",
    "Implementation Guidance:",
    ...renderImplementationGuidance(brief)
  );

  return sections;
}

function compilePromptBrief(sourceFile: SourceFile): CompiledPromptBrief {
  const root = sourceFile.root;

  if (!root) {
    return {
      kind: "unknown",
      name: "Unnamed",
      targetText: "unspecified target",
      platform: null,
      runtime: null,
      inputs: [],
      state: [],
      outputs: [],
      rules: [],
      constraints: [],
      preferences: [],
      flex: [],
      tests: []
    };
  }

  const targetParts = root.target?.parts ?? [];
  const [platform = null, runtime = null] = targetParts;

  return {
    kind: root.kind,
    name: root.name?.text ?? "Unnamed",
    targetText: targetParts.length > 0 ? targetParts.join(" ") : "unspecified target",
    platform,
    runtime,
    inputs: extractFieldLines(findSection(sourceFile, "inputs")),
    state: extractFieldLines(findSection(sourceFile, "state")),
    outputs: extractFieldLines(findSection(sourceFile, "outputs")),
    rules: extractTextLines(findSection(sourceFile, "rules")),
    constraints: extractTextLines(findSection(sourceFile, "constraints")),
    preferences: extractTextLines(findSection(sourceFile, "preferences")),
    flex: extractTextLines(findSection(sourceFile, "flex")),
    tests: extractTextLines(findSection(sourceFile, "tests"))
  };
}

function renderDeliverableRequirements(brief: CompiledPromptBrief): string[] {
  const requirements = [
    "- Return only the implementation artifact, with no explanations or commentary.",
    "- Produce a complete implementation, not a partial sketch."
  ];

  if (brief.platform === "python" && brief.runtime === "cli") {
    requirements.push("- Generate exactly one `.py` file named `script_under_test.py`.");
    requirements.push("- The file must be runnable as a Python CLI program.");
    requirements.push("- Do not wrap the code in Markdown fences.");
    return requirements;
  }

  if (brief.platform === "react") {
    requirements.push("- Generate the smallest complete React/TypeScript implementation that satisfies the brief.");
    requirements.push("- Do not wrap the code in Markdown fences unless the interface forces it.");
    return requirements;
  }

  requirements.push("- Generate the smallest complete implementation that satisfies the brief.");
  requirements.push("- Do not wrap the code in Markdown fences unless the interface forces it.");
  return requirements;
}

function renderImplementationGuidance(brief: CompiledPromptBrief): string[] {
  const guidance = [
    "- Preserve any explicit function signatures, CLI contracts, API response shapes, or exported names stated in the required behavior.",
    "- Keep error handling explicit and deterministic.",
    "- Ensure the final implementation satisfies the acceptance criteria."
  ];

  if (brief.platform === "python" && brief.runtime === "cli") {
    guidance.push("- If the outputs model an exit code, return `0` on success and a non-zero integer on failure.");
    guidance.push("- If the brief requires output files, write them only after successful validation and processing.");
  }

  return guidance;
}

function extractFieldLines(section: Section | undefined): string[] {
  if (!section || !isFieldSection(section)) {
    return [];
  }

  return section.content.map((entry) => renderFieldEntry(entry));
}

function extractTextLines(section: Section | undefined): string[] {
  if (!section || isFieldSection(section)) {
    return [];
  }

  return section.content.map((item) => item.text);
}

function renderFieldSection(title: string, lines: readonly string[]): string {
  if (lines.length === 0) {
    return `${title}:\n- None`;
  }

  return `${title}:\n${lines.map((line) => `- ${line}`).join("\n")}`;
}

function renderFieldEntry(entry: FieldEntry): string {
  const defaultSuffix =
    entry.defaultValueText === null ? "" : ` = ${entry.defaultValueText}`;
  return `${entry.name.text}: ${entry.typeText}${defaultSuffix}`;
}

function renderTextSection(
  title: string,
  lines: readonly string[],
  emptyLines: readonly string[]
): string {
  if (lines.length === 0) {
    return `${title}:\n${emptyLines.map((line) => `- ${line}`).join("\n")}`;
  }

  return `${title}:\n${lines.map((line, index) => `${index + 1}. ${line}`).join("\n")}`;
}

function renderSourceAppendix(sourceFile: SourceFile): string {
  const root = sourceFile.root;

  if (!root) {
    return "(empty)";
  }

  const lines = [
    `${root.kind} ${root.name?.text ?? "Unnamed"}`,
    ...(root.target ? [`target ${root.target.parts.join(" ")}`] : [])
  ];

  for (const section of root.sections) {
    lines.push("");
    lines.push(`${section.kind}:`);

    if (isFieldSection(section)) {
      for (const entry of section.content) {
        lines.push(`  ${renderFieldEntry(entry)}`);
      }
      continue;
    }

    for (const item of section.content) {
      lines.push(`  ${item.text}`);
    }
  }

  return lines.join("\n");
}
