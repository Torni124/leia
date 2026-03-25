"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSourceFile = validateSourceFile;
const ast_1 = require("./ast");
const diagnostics_1 = require("./diagnostics");
const language_1 = require("./language");
function validateSourceFile(sourceFile, language = language_1.DEFAULT_LANGUAGE) {
    const diagnostics = new diagnostics_1.DiagnosticBag();
    const root = sourceFile.root;
    if (!root) {
        diagnostics.error("semantic.missing_root", "File is missing a valid root declaration.", sourceFile.span, { fixHint: "Start the file with `component Name` or another supported root kind." });
        return diagnostics.toArray();
    }
    if (!root.name) {
        diagnostics.error("semantic.missing_root_name", "Root declaration is missing its name.", root.span, { fixHint: "Provide a name after the root kind." });
    }
    if (!root.target) {
        diagnostics.error("semantic.missing_target", "Exactly one `target` declaration is required.", root.span, { fixHint: "Add a line such as `target react typescript` near the top of the file." });
    }
    const sectionsByKind = new Map();
    for (const section of root.sections) {
        const existing = sectionsByKind.get(section.kind);
        if (existing) {
            existing.push(section);
        }
        else {
            sectionsByKind.set(section.kind, [section]);
        }
    }
    for (const [kind, sections] of sectionsByKind) {
        const spec = (0, language_1.getSectionSpec)(kind, language);
        if (spec.unique && sections.length > 1) {
            const first = sections[0];
            const duplicates = sections.slice(1);
            for (const duplicate of duplicates) {
                diagnostics.error("semantic.duplicate_section", `Section \`${kind}\` may only appear once.`, duplicate.span, {
                    relatedInformation: [
                        {
                            message: "First section is here.",
                            span: first.span
                        }
                    ],
                    fixHint: "Merge the duplicate content into a single section."
                });
            }
        }
    }
    for (const section of root.sections) {
        if ((0, ast_1.isFieldSection)(section)) {
            validateFieldSection(section.kind, section.content, diagnostics);
            continue;
        }
        if ((section.kind === "rules" || section.kind === "constraints" || section.kind === "tests") &&
            section.content.length === 0) {
            diagnostics.warning("semantic.empty_section", `Section \`${section.kind}\` is empty.`, section.span, { fixHint: `Add at least one item to \`${section.kind}\` or remove the section.` });
        }
    }
    const hasRules = sectionsByKind.has("rules");
    const hasConstraints = sectionsByKind.has("constraints");
    const hasPreferences = sectionsByKind.has("preferences");
    const hasFlex = sectionsByKind.has("flex");
    const hasTests = sectionsByKind.has("tests");
    if (!hasTests) {
        diagnostics.warning("semantic.missing_tests", "No `tests` section is defined.", root.span, { fixHint: "Add acceptance criteria in a `tests:` block." });
    }
    if (!hasFlex) {
        diagnostics.warning("semantic.missing_flex", "No `flex` section is defined.", root.span, { fixHint: "Add a `flex:` block to mark intentionally AI-decided areas." });
    }
    if (hasConstraints && !hasTests) {
        diagnostics.warning("semantic.constraints_without_tests", "Constraints exist without tests to verify them.", root.span, { fixHint: "Add a `tests:` section to capture acceptance checks for the constraints." });
    }
    if (hasPreferences && !hasRules) {
        diagnostics.warning("semantic.preferences_without_rules", "Preferences are defined without a `rules` section.", root.span, { fixHint: "Add a `rules:` section for hard behavior requirements." });
    }
    return diagnostics.toArray();
}
function validateFieldSection(sectionKind, fields, diagnostics) {
    const names = new Map();
    for (const field of fields) {
        const existing = names.get(field.name.text);
        if (existing) {
            diagnostics.error("semantic.duplicate_field", `Duplicate field name \`${field.name.text}\` in section \`${sectionKind}\`.`, field.name.span, {
                relatedInformation: [
                    {
                        message: "First field is here.",
                        span: existing.name.span
                    }
                ],
                fixHint: "Rename the field or merge its definition."
            });
            continue;
        }
        names.set(field.name.text, field);
    }
}
//# sourceMappingURL=validator.js.map