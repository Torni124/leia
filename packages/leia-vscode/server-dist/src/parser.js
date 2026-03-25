"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSource = parseSource;
const diagnostics_1 = require("./diagnostics");
const language_1 = require("./language");
const lexer_1 = require("./lexer");
const span_1 = require("./span");
function splitFirstWord(text) {
    const trimmed = text.trim();
    const match = /^([^\s:]+)([\s\S]*)$/.exec(trimmed);
    if (!match) {
        return { word: "", remainder: "" };
    }
    return {
        word: match[1] ?? "",
        remainder: (match[2] ?? "").trim()
    };
}
function trimBounds(text, start, end) {
    let actualStart = start;
    let actualEnd = end;
    while (actualStart < actualEnd && /\s/.test(text[actualStart] ?? "")) {
        actualStart += 1;
    }
    while (actualEnd > actualStart && /\s/.test(text[actualEnd - 1] ?? "")) {
        actualEnd -= 1;
    }
    return [actualStart, actualEnd];
}
function absoluteSpanFromLine(line, lineStarts, start, end) {
    if (!line.contentSpan) {
        return line.span;
    }
    const [actualStart, actualEnd] = trimBounds(line.contentText, start, end);
    return (0, span_1.spanFromOffsets)(lineStarts, line.contentSpan.start + actualStart, line.contentSpan.start + actualEnd);
}
class Parser {
    lexResult;
    language;
    diagnostics = new diagnostics_1.DiagnosticBag();
    contentLines;
    index = 0;
    constructor(lexResult, language) {
        this.lexResult = lexResult;
        this.language = language;
        this.contentLines = lexResult.lines.filter((line) => line.kind === "content");
    }
    parse() {
        const sourceFile = this.parseSourceFile();
        return {
            sourceFile,
            diagnostics: [...this.lexResult.diagnostics, ...this.diagnostics.toArray()],
            lexResult: this.lexResult
        };
    }
    parseSourceFile() {
        if (this.contentLines.length === 0) {
            this.diagnostics.error("syntax.missing_root_declaration", "Expected a root declaration such as `component Name`.", (0, span_1.spanFromOffsets)(this.lexResult.lineStarts, 0, 0), { fixHint: "Start the file with a root declaration." });
            return {
                nodeType: "SourceFile",
                root: null,
                comments: this.lexResult.comments,
                span: (0, span_1.spanFromOffsets)(this.lexResult.lineStarts, 0, 0)
            };
        }
        const root = this.parseRootDeclaration(this.contentLines[0]);
        this.index = 1;
        let target = null;
        const sections = [];
        while (this.index < this.contentLines.length) {
            const line = this.contentLines[this.index];
            if (!line || !line.contentSpan) {
                this.index += 1;
                continue;
            }
            if (line.indent !== 0) {
                this.diagnostics.error("syntax.unexpected_indent", "Unexpected indentation at the top level.", line.contentSpan, { fixHint: "Top-level declarations must start in column 1." });
                this.index += 1;
                continue;
            }
            const headerText = line.contentText.trim();
            const colonIndex = headerText.indexOf(":");
            const { word: leadingWord } = splitFirstWord(headerText);
            if (leadingWord === this.language.targetKeyword) {
                const parsedTarget = this.parseTargetDeclaration(line);
                if (target) {
                    this.diagnostics.error("syntax.duplicate_target", "Duplicate target declaration.", line.contentSpan, {
                        relatedInformation: [
                            {
                                message: "First target declaration is here.",
                                span: target.span
                            }
                        ],
                        fixHint: "Keep exactly one `target` declaration."
                    });
                }
                else {
                    target = parsedTarget;
                }
                this.index += 1;
                continue;
            }
            if (colonIndex !== -1) {
                const sectionName = headerText.slice(0, colonIndex).trim();
                const trailing = headerText.slice(colonIndex + 1).trim();
                if (trailing.length > 0) {
                    this.diagnostics.error("syntax.unexpected_section_header_text", "Section headers must end after the colon.", line.contentSpan, { fixHint: "Move section content into the indented block below." });
                }
                if (!(0, language_1.isSectionKind)(sectionName, this.language)) {
                    this.diagnostics.error("semantic.unknown_section", `Unknown section name \`${sectionName}\`.`, absoluteSpanFromLine(line, this.lexResult.lineStarts, 0, colonIndex), {
                        fixHint: `Use one of: ${this.language.sections
                            .map((section) => section.kind)
                            .join(", ")}.`
                    });
                    this.skipIndentedBlock();
                    continue;
                }
                sections.push(this.parseSection(line, sectionName));
                continue;
            }
            if ((0, language_1.isSectionKind)(leadingWord, this.language)) {
                this.diagnostics.error("syntax.missing_section_colon", `Expected a colon after section name \`${leadingWord}\`.`, line.contentSpan, { fixHint: `Write \`${leadingWord}:\` on its own line.` });
                this.index += 1;
                continue;
            }
            if ((0, language_1.isRootKind)(leadingWord, this.language)) {
                this.diagnostics.error("semantic.duplicate_root_declaration", "Leia v1 supports exactly one root declaration per file.", line.contentSpan, { fixHint: "Split additional declarations into separate files." });
                this.index += 1;
                continue;
            }
            this.diagnostics.error("syntax.unknown_top_level", "Unknown top-level declaration.", line.contentSpan, {
                fixHint: "Use `target ...` or a known section header such as `inputs:` or `rules:`."
            });
            this.index += 1;
        }
        const finalRoot = root
            ? {
                ...root,
                target,
                sections,
                span: this.mergeRootSpan(root, target, sections)
            }
            : null;
        return {
            nodeType: "SourceFile",
            root: finalRoot,
            comments: this.lexResult.comments,
            span: finalRoot?.span ?? (0, span_1.spanFromOffsets)(this.lexResult.lineStarts, 0, 0)
        };
    }
    parseRootDeclaration(line) {
        if (!line.contentSpan) {
            return null;
        }
        if (line.indent !== 0) {
            this.diagnostics.error("syntax.unexpected_indent", "Root declaration must start at the top level.", line.contentSpan, { fixHint: "Remove indentation before the root declaration." });
        }
        const { word, remainder } = splitFirstWord(line.contentText);
        if (!(0, language_1.isRootKind)(word, this.language)) {
            this.diagnostics.error("syntax.expected_root_kind", `Expected a root declaration keyword (${this.language.rootKinds.join(", ")}).`, line.contentSpan, { fixHint: "Start the file with `component Name` or another supported root kind." });
            return null;
        }
        let name = null;
        if (remainder.length === 0) {
            this.diagnostics.error("syntax.expected_root_name", `Expected an identifier after \`${word}\`.`, line.contentSpan, { fixHint: "Provide a declaration name such as `component UserCard`." });
        }
        else {
            const nameMatch = /^([A-Za-z_][A-Za-z0-9_]*)([\s\S]*)$/.exec(remainder);
            if (!nameMatch) {
                this.diagnostics.error("syntax.expected_identifier", "Root declaration name must be a valid identifier.", line.contentSpan, { fixHint: "Identifiers must start with a letter or underscore." });
            }
            else {
                const identifierText = nameMatch[1] ?? "";
                const trailing = (nameMatch[2] ?? "").trim();
                const nameStart = line.contentText.indexOf(identifierText);
                const nameSpan = absoluteSpanFromLine(line, this.lexResult.lineStarts, nameStart, nameStart + identifierText.length);
                if (trailing.length > 0) {
                    this.diagnostics.error("syntax.unexpected_root_trailing_text", "Unexpected extra text after the root declaration name.", line.contentSpan, { fixHint: "Move additional details into sections below the header." });
                }
                name = {
                    nodeType: "Identifier",
                    text: identifierText,
                    span: nameSpan
                };
            }
        }
        return {
            nodeType: "RootDecl",
            kind: word,
            name,
            target: null,
            sections: [],
            span: line.contentSpan
        };
    }
    parseTargetDeclaration(line) {
        const text = line.contentText.trim();
        const remainder = text.slice(this.language.targetKeyword.length).trim();
        if (remainder.length === 0) {
            this.diagnostics.error("syntax.malformed_target", "Target declaration must include at least one part.", line.contentSpan ?? line.span, { fixHint: "For example: `target react typescript`." });
        }
        return {
            nodeType: "TargetDecl",
            parts: remainder.length > 0 ? remainder.split(/\s+/) : [],
            span: line.contentSpan ?? line.span
        };
    }
    parseSection(line, sectionKind) {
        const spec = (0, language_1.getSectionSpec)(sectionKind, this.language);
        const headerSpan = line.contentSpan ?? line.span;
        const childLines = this.collectIndentedBlock();
        const lastChildSpan = childLines[childLines.length - 1]?.contentSpan ?? null;
        const span = lastChildSpan ? (0, span_1.mergeSpans)(headerSpan, lastChildSpan) : headerSpan;
        if (spec.contentKind === "fields") {
            const content = [];
            for (const childLine of childLines) {
                if (childLine.indent !== 1) {
                    this.diagnostics.error("syntax.unexpected_nested_block", `Section \`${sectionKind}\` does not support nested indentation in v1.`, childLine.contentSpan ?? childLine.span, { fixHint: "Keep entries indented by exactly one level (2 spaces)." });
                    continue;
                }
                const entry = this.parseFieldEntry(childLine);
                if (entry) {
                    content.push(entry);
                }
            }
            return {
                nodeType: "Section",
                kind: sectionKind,
                content,
                span
            };
        }
        const content = [];
        for (const childLine of childLines) {
            if (childLine.indent !== 1) {
                this.diagnostics.error("syntax.unexpected_nested_block", `Section \`${sectionKind}\` does not support nested indentation in v1.`, childLine.contentSpan ?? childLine.span, { fixHint: "Keep items indented by exactly one level (2 spaces)." });
                continue;
            }
            const item = this.parseTextItem(childLine);
            if (item) {
                content.push(item);
            }
        }
        return {
            nodeType: "Section",
            kind: sectionKind,
            content,
            span
        };
    }
    parseFieldEntry(line) {
        if (!line.contentSpan) {
            return null;
        }
        const text = line.contentText.trim();
        const colonIndex = text.indexOf(":");
        if (colonIndex <= 0) {
            this.diagnostics.error("syntax.malformed_field_entry", "Malformed field entry. Expected `name: Type`.", line.contentSpan, { fixHint: "Use `name: Type` or `name: Type = defaultValue`." });
            return null;
        }
        const rawName = text.slice(0, colonIndex).trim();
        if (!(0, language_1.isIdentifierText)(rawName)) {
            this.diagnostics.error("syntax.expected_identifier", `Invalid field name \`${rawName}\`.`, line.contentSpan, { fixHint: "Field names must start with a letter or underscore." });
            return null;
        }
        const equalsIndex = text.indexOf("=", colonIndex + 1);
        const rawType = equalsIndex === -1
            ? text.slice(colonIndex + 1).trim()
            : text.slice(colonIndex + 1, equalsIndex).trim();
        if (rawType.length === 0) {
            this.diagnostics.error("syntax.missing_type_annotation", `Field \`${rawName}\` is missing a type annotation.`, line.contentSpan, { fixHint: "Provide a type after the colon." });
            return null;
        }
        const rawDefault = equalsIndex === -1 ? null : text.slice(equalsIndex + 1).trim();
        if (rawDefault !== null && rawDefault.length === 0) {
            this.diagnostics.error("syntax.missing_default_value", `Field \`${rawName}\` has \`=\` but no default value.`, line.contentSpan, { fixHint: "Provide a default value after the equals sign or remove it." });
            return null;
        }
        const nameStart = text.indexOf(rawName);
        const typeStart = colonIndex + 1;
        const typeEnd = equalsIndex === -1 ? text.length : equalsIndex;
        const nameSpan = absoluteSpanFromLine(line, this.lexResult.lineStarts, nameStart, nameStart + rawName.length);
        const typeSpan = absoluteSpanFromLine(line, this.lexResult.lineStarts, typeStart, typeEnd);
        const defaultValueSpan = rawDefault === null
            ? null
            : absoluteSpanFromLine(line, this.lexResult.lineStarts, equalsIndex + 1, text.length);
        const fieldSpan = defaultValueSpan === null
            ? (0, span_1.mergeSpans)(nameSpan, typeSpan)
            : (0, span_1.mergeSpans)(nameSpan, defaultValueSpan);
        return {
            nodeType: "FieldEntry",
            name: {
                nodeType: "Identifier",
                text: rawName,
                span: nameSpan
            },
            typeText: rawType,
            typeSpan,
            defaultValueText: rawDefault,
            defaultValueSpan,
            span: fieldSpan
        };
    }
    parseTextItem(line) {
        if (!line.contentSpan) {
            return null;
        }
        const trimmed = line.contentText.trim();
        const normalized = trimmed.startsWith("- ") ? trimmed.slice(2).trim() : /^-\s*$/.test(trimmed) ? "" : trimmed;
        if (normalized.length === 0) {
            this.diagnostics.error("syntax.empty_text_item", "Expected non-empty text inside the section block.", line.contentSpan, { fixHint: "Write a freeform statement on this line or remove the line." });
            return null;
        }
        return {
            nodeType: "TextItem",
            text: normalized,
            span: line.contentSpan
        };
    }
    collectIndentedBlock() {
        const lines = [];
        this.index += 1;
        while (this.index < this.contentLines.length) {
            const line = this.contentLines[this.index];
            if (!line || line.indent === 0) {
                break;
            }
            lines.push(line);
            this.index += 1;
        }
        return lines;
    }
    skipIndentedBlock() {
        this.index += 1;
        while (this.index < this.contentLines.length && (this.contentLines[this.index]?.indent ?? 0) > 0) {
            this.index += 1;
        }
    }
    mergeRootSpan(root, target, sections) {
        let span = root.span;
        if (target) {
            span = (0, span_1.mergeSpans)(span, target.span);
        }
        if (sections.length > 0) {
            span = (0, span_1.mergeSpans)(span, sections[sections.length - 1].span);
        }
        return span;
    }
}
function parseSource(text, language = language_1.DEFAULT_LANGUAGE) {
    const lexResult = (0, lexer_1.lexSource)(text, language);
    const parser = new Parser(lexResult, language);
    return parser.parse();
}
//# sourceMappingURL=parser.js.map