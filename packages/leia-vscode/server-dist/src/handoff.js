"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultHandoffPath = getDefaultHandoffPath;
exports.writeHandoffFile = writeHandoffFile;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const prompt_1 = require("./prompt");
function getDefaultHandoffPath(specFilePath) {
    const specDir = (0, node_path_1.dirname)(specFilePath);
    const specBaseName = (0, node_path_1.basename)(specFilePath, ".leia");
    return (0, node_path_1.join)(specDir, `${specBaseName}.prompt.txt`);
}
function writeHandoffFile(sourceFile, specFilePath, options = {}) {
    const outFile = options.outFile ?? getDefaultHandoffPath(specFilePath);
    const prompt = `${(0, prompt_1.renderPrompt)(sourceFile)}\n`;
    (0, node_fs_1.writeFileSync)(outFile, prompt, "utf8");
    return outFile;
}
//# sourceMappingURL=handoff.js.map