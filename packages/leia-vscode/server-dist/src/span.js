"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeLineStarts = computeLineStarts;
exports.offsetToPosition = offsetToPosition;
exports.spanFromOffsets = spanFromOffsets;
exports.mergeSpans = mergeSpans;
function computeLineStarts(text) {
    const lineStarts = [0];
    for (let index = 0; index < text.length; index += 1) {
        if (text[index] === "\n") {
            lineStarts.push(index + 1);
        }
    }
    return lineStarts;
}
function offsetToPosition(lineStarts, offset) {
    const safeOffset = Math.max(0, offset);
    let low = 0;
    let high = lineStarts.length - 1;
    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const lineStart = lineStarts[mid] ?? 0;
        const nextLineStart = lineStarts[mid + 1];
        if (nextLineStart !== undefined && safeOffset >= nextLineStart) {
            low = mid + 1;
            continue;
        }
        if (safeOffset < lineStart) {
            high = mid - 1;
            continue;
        }
        return {
            offset: safeOffset,
            line: mid + 1,
            column: safeOffset - lineStart + 1
        };
    }
    const lastIndex = Math.max(0, lineStarts.length - 1);
    const lastStart = lineStarts[lastIndex] ?? 0;
    return {
        offset: safeOffset,
        line: lastIndex + 1,
        column: safeOffset - lastStart + 1
    };
}
function spanFromOffsets(lineStarts, start, end) {
    const safeEnd = Math.max(start, end);
    const startPosition = offsetToPosition(lineStarts, start);
    const endPosition = offsetToPosition(lineStarts, safeEnd);
    return {
        start,
        end: safeEnd,
        startLine: startPosition.line,
        startColumn: startPosition.column,
        endLine: endPosition.line,
        endColumn: endPosition.column
    };
}
function mergeSpans(first, second) {
    return {
        start: first.start,
        end: second.end,
        startLine: first.startLine,
        startColumn: first.startColumn,
        endLine: second.endLine,
        endColumn: second.endColumn
    };
}
//# sourceMappingURL=span.js.map