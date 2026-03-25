"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletionSuggestions = getCompletionSuggestions;
const language_1 = require("./language");
const ROOT_KIND_DOCUMENTATION = {
    component: "Declare a UI-facing component intent spec.",
    endpoint: "Declare an API endpoint intent spec.",
    job: "Declare a background or batch job intent spec.",
    module: "Declare a reusable module intent spec."
};
const SECTION_DOCUMENTATION = {
    inputs: "Declare named typed inputs consumed by the root declaration.",
    state: "Declare named typed internal state with optional default values.",
    outputs: "Declare named typed outputs produced by the root declaration.",
    rules: "List hard required behaviors the generated implementation must satisfy.",
    constraints: "List hard restrictions the generated implementation must not violate.",
    preferences: "List soft preferences that guide the implementation when possible.",
    flex: "List areas intentionally left open for the model to decide.",
    tests: "List acceptance criteria that describe the intended observable behavior.",
    imports: "Reserved for future cross-file include or import declarations."
};
function getCompletionSuggestions(text, position, language = language_1.DEFAULT_LANGUAGE) {
    const lines = splitLines(text);
    const lineIndex = clamp(position.line, 0, Math.max(0, lines.length - 1));
    const lineText = lines[lineIndex] ?? "";
    const character = clamp(position.character, 0, lineText.length);
    const linePrefix = lineText.slice(0, character);
    if (isIndentedLine(lineText) || linePrefix.trimStart().startsWith("#")) {
        return [];
    }
    const wordPrefix = getWordPrefix(linePrefix);
    const scan = scanTopLevelLines(lines, lineIndex, language);
    if (!scan.hasMeaningfulTopLevelBeforeCurrentLine) {
        return filterSuggestions(createRootSuggestions(language), wordPrefix);
    }
    if (!scan.hasRootBeforeCurrentLine) {
        return [];
    }
    const suggestions = [];
    if (!scan.hasTargetElsewhere) {
        suggestions.push(createTargetSuggestion(language));
    }
    for (const section of language.sections) {
        if (!scan.existingSections.has(section.kind)) {
            suggestions.push(createSectionSuggestion(section.kind, language));
        }
    }
    return filterSuggestions(suggestions, wordPrefix);
}
function splitLines(text) {
    return text.split(/\r?\n/);
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function isIndentedLine(lineText) {
    return /^[ \t]/.test(lineText);
}
function getWordPrefix(linePrefix) {
    const match = /[A-Za-z_][A-Za-z0-9_]*$/.exec(linePrefix);
    return match?.[0] ?? "";
}
function filterSuggestions(suggestions, wordPrefix) {
    if (!wordPrefix) {
        return [...suggestions];
    }
    const normalizedPrefix = wordPrefix.toLowerCase();
    return suggestions.filter((suggestion) => (suggestion.filterText ?? suggestion.label).toLowerCase().startsWith(normalizedPrefix));
}
function scanTopLevelLines(lines, currentLineIndex, language) {
    let hasMeaningfulTopLevelBeforeCurrentLine = false;
    let hasRootBeforeCurrentLine = false;
    let hasTargetElsewhere = false;
    const existingSections = new Set();
    for (const [index, lineText] of lines.entries()) {
        const classification = classifyTopLevelLine(lineText, language);
        if (index < currentLineIndex && classification.kind !== "blank" && classification.kind !== "comment") {
            hasMeaningfulTopLevelBeforeCurrentLine = true;
        }
        if (index < currentLineIndex && classification.kind === "root") {
            hasRootBeforeCurrentLine = true;
        }
        if (index === currentLineIndex) {
            continue;
        }
        if (classification.kind === "target") {
            hasTargetElsewhere = true;
        }
        if (classification.kind === "section") {
            existingSections.add(classification.sectionKind);
        }
    }
    return {
        hasMeaningfulTopLevelBeforeCurrentLine,
        hasRootBeforeCurrentLine,
        hasTargetElsewhere,
        existingSections
    };
}
function classifyTopLevelLine(lineText, language) {
    if (lineText.trim() === "") {
        return { kind: "blank" };
    }
    if (isIndentedLine(lineText)) {
        return { kind: "unknown" };
    }
    const trimmed = lineText.trim();
    if (trimmed.startsWith("#")) {
        return { kind: "comment" };
    }
    if (trimmed.endsWith(":")) {
        const sectionCandidate = trimmed.slice(0, -1).trim();
        if ((0, language_1.isSectionKind)(sectionCandidate, language)) {
            return {
                kind: "section",
                sectionKind: sectionCandidate
            };
        }
    }
    const firstWord = trimmed.match(/^[A-Za-z_][A-Za-z0-9_]*/)?.[0];
    if (!firstWord) {
        return { kind: "unknown" };
    }
    if (firstWord === language.targetKeyword) {
        return { kind: "target" };
    }
    if ((0, language_1.isRootKind)(firstWord, language)) {
        return { kind: "root" };
    }
    return { kind: "unknown" };
}
function createRootSuggestions(language) {
    return language.rootKinds.map((kind, index) => ({
        label: kind,
        kind: "keyword",
        detail: `${capitalize(kind)} declaration`,
        documentation: ROOT_KIND_DOCUMENTATION[kind],
        insertText: `${kind} \${1:Name}`,
        insertTextFormat: "snippet",
        filterText: kind,
        sortText: `0${index}`
    }));
}
function createTargetSuggestion(language) {
    return {
        label: language.targetKeyword,
        kind: "keyword",
        detail: "Target declaration",
        documentation: "Declare the execution or output target for this Leia spec.",
        insertText: `${language.targetKeyword} \${1:platform}`,
        insertTextFormat: "snippet",
        filterText: language.targetKeyword,
        sortText: "10"
    };
}
function createSectionSuggestion(kind, language) {
    const spec = (0, language_1.getSectionSpec)(kind, language);
    return {
        label: `${kind}:`,
        kind: "section",
        detail: spec.contentKind === "fields" ? "Field section" : "Text section",
        documentation: SECTION_DOCUMENTATION[kind],
        insertText: spec.contentKind === "fields"
            ? createFieldSectionSnippet(kind)
            : createTextSectionSnippet(kind),
        insertTextFormat: "snippet",
        filterText: kind,
        sortText: `2${language.sections.findIndex((section) => section.kind === kind)}`
    };
}
function createFieldSectionSnippet(kind) {
    const placeholderByKind = {
        inputs: "${1:name}: ${2:Type}",
        state: "${1:name}: ${2:Type} = ${3:defaultValue}",
        outputs: "${1:name}: ${2:Type}"
    };
    return `${kind}:\n  ${placeholderByKind[kind]}`;
}
function createTextSectionSnippet(kind) {
    const placeholderByKind = {
        rules: "${1:describe required behavior}",
        constraints: "${1:describe hard restriction}",
        preferences: "${1:describe soft preference}",
        flex: "${1:describe an intentionally flexible area}",
        tests: "${1:describe an acceptance criterion}",
        imports: "${1:describe a future import or include}"
    };
    return `${kind}:\n  ${placeholderByKind[kind]}`;
}
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}
//# sourceMappingURL=completion.js.map