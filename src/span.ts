export interface Position {
  readonly offset: number;
  readonly line: number;
  readonly column: number;
}

export interface SourceSpan {
  readonly start: number;
  readonly end: number;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export function computeLineStarts(text: string): number[] {
  const lineStarts = [0];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      lineStarts.push(index + 1);
    }
  }

  return lineStarts;
}

export function offsetToPosition(lineStarts: readonly number[], offset: number): Position {
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

export function spanFromOffsets(
  lineStarts: readonly number[],
  start: number,
  end: number
): SourceSpan {
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

export function mergeSpans(first: SourceSpan, second: SourceSpan): SourceSpan {
  return {
    start: first.start,
    end: second.end,
    startLine: first.startLine,
    startColumn: first.startColumn,
    endLine: second.endLine,
    endColumn: second.endColumn
  };
}
