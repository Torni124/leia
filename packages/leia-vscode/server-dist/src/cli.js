#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const analyze_1 = require("./analyze");
const diagnostics_1 = require("./diagnostics");
const formatter_1 = require("./formatter");
const handoff_1 = require("./handoff");
const prompt_1 = require("./prompt");
function main(argv) {
    const [command, ...rest] = argv;
    switch (command) {
        case "check":
            return runCheck(rest);
        case "ast":
            return runAst(rest);
        case "format":
            return runFormat(rest);
        case "prompt":
            return runPrompt(rest);
        case "handoff":
            return runHandoff(rest);
        case "--help":
        case "-h":
        case undefined:
            printHelp();
            return command ? 0 : 1;
        default:
            process.stderr.write(`Unknown command: ${command}\n\n`);
            printHelp();
            return 1;
    }
}
function runCheck(args) {
    const filePath = requireFilePath(args);
    if (!filePath) {
        return 1;
    }
    const absolutePath = (0, node_path_1.resolve)(filePath);
    const sourceText = (0, node_fs_1.readFileSync)(absolutePath, "utf8");
    const analysis = (0, analyze_1.analyzeSource)(sourceText);
    emitDiagnostics(analysis.diagnostics, absolutePath);
    return (0, diagnostics_1.hasErrors)(analysis.diagnostics) ? 1 : 0;
}
function runAst(args) {
    const filePath = requireFilePath(args);
    if (!filePath) {
        return 1;
    }
    const absolutePath = (0, node_path_1.resolve)(filePath);
    const sourceText = (0, node_fs_1.readFileSync)(absolutePath, "utf8");
    const analysis = (0, analyze_1.analyzeSource)(sourceText);
    emitDiagnostics(analysis.diagnostics, absolutePath);
    process.stdout.write(`${JSON.stringify(analysis.sourceFile, null, 2)}\n`);
    return (0, diagnostics_1.hasErrors)(analysis.diagnostics) ? 1 : 0;
}
function runFormat(args) {
    const write = args.includes("--write");
    const filePath = requireFilePath(args.filter((arg) => arg !== "--write"));
    if (!filePath) {
        return 1;
    }
    const absolutePath = (0, node_path_1.resolve)(filePath);
    const sourceText = (0, node_fs_1.readFileSync)(absolutePath, "utf8");
    const analysis = (0, analyze_1.analyzeSource)(sourceText);
    emitDiagnostics(analysis.diagnostics, absolutePath);
    if ((0, diagnostics_1.hasErrors)(analysis.diagnostics)) {
        return 1;
    }
    const formatted = (0, formatter_1.formatSourceFile)(analysis.sourceFile);
    if (write) {
        (0, node_fs_1.writeFileSync)(absolutePath, formatted, "utf8");
        return 0;
    }
    process.stdout.write(formatted);
    return 0;
}
function runPrompt(args) {
    const filePath = requireFilePath(args);
    if (!filePath) {
        return 1;
    }
    const absolutePath = (0, node_path_1.resolve)(filePath);
    const sourceText = (0, node_fs_1.readFileSync)(absolutePath, "utf8");
    const analysis = (0, analyze_1.analyzeSource)(sourceText);
    emitDiagnostics(analysis.diagnostics, absolutePath);
    if ((0, diagnostics_1.hasErrors)(analysis.diagnostics)) {
        return 1;
    }
    process.stdout.write(`${(0, prompt_1.renderPrompt)(analysis.sourceFile)}\n`);
    return 0;
}
function runHandoff(args) {
    const { filePath, outFile } = parseFileAndOutArgs(args);
    if (!filePath) {
        process.stderr.write("Expected a file path.\n");
        return 1;
    }
    if (args.includes("--out") && !outFile) {
        process.stderr.write("Expected a file path after --out.\n");
        return 1;
    }
    const absolutePath = (0, node_path_1.resolve)(filePath);
    const sourceText = (0, node_fs_1.readFileSync)(absolutePath, "utf8");
    const analysis = (0, analyze_1.analyzeSource)(sourceText);
    emitDiagnostics(analysis.diagnostics, absolutePath);
    if ((0, diagnostics_1.hasErrors)(analysis.diagnostics)) {
        return 1;
    }
    const resolvedOutFile = outFile ? (0, node_path_1.resolve)(outFile) : (0, handoff_1.getDefaultHandoffPath)(absolutePath);
    (0, handoff_1.writeHandoffFile)(analysis.sourceFile, absolutePath, { outFile: resolvedOutFile });
    process.stdout.write(`${resolvedOutFile}\n`);
    return 0;
}
function requireFilePath(args) {
    const filePath = args[0];
    if (!filePath) {
        process.stderr.write("Expected a file path.\n");
        return null;
    }
    return filePath;
}
function parseFileAndOutArgs(args) {
    let filePath = null;
    let outFile = null;
    for (let index = 0; index < args.length; index += 1) {
        const value = args[index];
        if (value === "--out") {
            outFile = args[index + 1] ?? null;
            index += 1;
            continue;
        }
        if (!filePath) {
            filePath = value ?? null;
        }
    }
    return { filePath, outFile };
}
function emitDiagnostics(diagnostics, filePath) {
    for (const diagnostic of diagnostics) {
        process.stderr.write(`${(0, diagnostics_1.formatDiagnostic)(diagnostic, filePath)}\n\n`);
    }
}
function printHelp() {
    process.stdout.write([
        "leia check <file>",
        "leia ast <file>",
        "leia format <file> [--write]",
        "leia prompt <file>",
        "leia handoff <file> [--out <file>]"
    ].join("\n") + "\n");
}
process.exitCode = main(process.argv.slice(2));
//# sourceMappingURL=cli.js.map