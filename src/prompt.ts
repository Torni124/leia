import type { SourceFile } from "./ast";
import { formatSourceFile } from "./formatter";

export interface PromptRenderOptions {
  readonly includePreamble?: boolean;
}

export function renderPrompt(
  sourceFile: SourceFile,
  options: PromptRenderOptions = {}
): string {
  const root = sourceFile.root;

  if (!root) {
    return "";
  }

  const formattedSpec = formatSourceFile(sourceFile).trimEnd();
  const promptSections = [
    "You are a coding model implementing software from a Leia spec.",
    "",
    "Your job is to generate code that follows the spec exactly.",
    "",
    "Interpret the Leia spec with these rules:",
    "- Treat `rules` as mandatory behavior.",
    "- Treat `constraints` as hard requirements that must never be violated.",
    "- Treat `preferences` as soft guidance only.",
    "- Treat `flex` as the only area where you may choose implementation details.",
    "- Do not invent behavior that conflicts with or expands beyond the spec.",
    "- Keep the implementation aligned to the declared `target`.",
    "",
    "Output requirements:",
    ...renderOutputRequirements(sourceFile),
    "",
    "Implementation guidance:",
    ...renderImplementationGuidance(sourceFile),
    "",
    "Leia spec:",
    formattedSpec
  ];

  const promptBody = promptSections.join("\n");

  if (options.includePreamble === false) {
    return promptBody;
  }

  return promptBody;
}

function renderOutputRequirements(sourceFile: SourceFile): string[] {
  const targetParts = sourceFile.root?.target?.parts ?? [];
  const [platform, runtime] = targetParts;
  const requirements = [
    "- Generate complete, runnable code.",
    "- Do not include explanations before or after the code."
  ];

  if (platform === "python" && runtime === "cli") {
    requirements.push("- Generate exactly one `.py` file named `script_under_test.py`.");
    requirements.push("- The file must be complete and runnable as a script.");
    requirements.push("- Do not wrap the code in Markdown fences.");
    requirements.push("- Expose any functions required by the spec so tests can import them.");
    return requirements;
  }

  if (platform === "react") {
    requirements.push("- Generate the smallest complete React/TypeScript implementation that satisfies the spec.");
    requirements.push("- Do not wrap the code in Markdown fences unless the interface requires it.");
    return requirements;
  }

  requirements.push("- Generate the smallest complete implementation that satisfies the spec.");
  requirements.push("- Do not wrap the code in Markdown fences unless the interface requires it.");
  return requirements;
}

function renderImplementationGuidance(sourceFile: SourceFile): string[] {
  const targetParts = sourceFile.root?.target?.parts ?? [];
  const [platform, runtime] = targetParts;
  const guidance = [
    "- Preserve any explicit function signatures, CLI contracts, or response shapes stated in the spec.",
    "- Keep error handling explicit and deterministic.",
    "- Preserve behavior required by the `tests` section."
  ];

  if (platform === "python" && runtime === "cli") {
    guidance.push("- Return `0` on success and a non-zero integer on failure when the spec models an exit code.");
    guidance.push("- If the spec requires output files, write them only after successful validation and processing.");
  }

  return guidance;
}
