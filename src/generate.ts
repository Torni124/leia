import { writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import type { SourceFile } from "./ast";
import { renderPrompt, type PromptStyle } from "./prompt";

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
export const DEFAULT_ANTHROPIC_MAX_TOKENS = 16_384;

interface AnthropicTextBlock {
  readonly type: string;
  readonly text?: string;
}

interface AnthropicMessageResponse {
  readonly content: readonly AnthropicTextBlock[];
}

export interface AnthropicMessagesClient {
  readonly messages: {
    create(request: {
      readonly model: string;
      readonly max_tokens: number;
      readonly messages: readonly [{
        readonly role: "user";
        readonly content: string;
      }];
    }): Promise<AnthropicMessageResponse>;
  };
}

export interface AnthropicGenerateOptions {
  readonly apiKey?: string;
  readonly client?: AnthropicMessagesClient;
  readonly includeSourceAppendix?: boolean;
  readonly maxTokens?: number;
  readonly model?: string;
  readonly outFile?: string;
  readonly style?: PromptStyle;
}

export interface AnthropicGenerationResult {
  readonly artifactText: string;
  readonly model: string;
  readonly outFile: string;
  readonly promptText: string;
  readonly rawResponseText: string;
}

export function getDefaultGeneratedArtifactPath(
  sourceFile: SourceFile,
  specFilePath: string
): string {
  const specDir = dirname(specFilePath);
  const specBaseName = basename(specFilePath, ".leia");
  const platform = sourceFile.root?.target?.parts[0] ?? null;
  const runtime = sourceFile.root?.target?.parts[1] ?? null;

  if (platform === "python") {
    return join(specDir, `${specBaseName}.generated.py`);
  }

  if (platform === "react") {
    return join(specDir, `${specBaseName}.generated.tsx`);
  }

  if (platform === "node" || runtime === "typescript") {
    return join(specDir, `${specBaseName}.generated.ts`);
  }

  return join(specDir, `${specBaseName}.generated.txt`);
}

export function sanitizeGeneratedArtifact(rawText: string): string {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```[^\r\n`]*\r?\n([\s\S]*?)\r?\n```/);
  const body = fencedMatch?.[1] ?? trimmed;
  return `${body.trimEnd()}\n`;
}

export function extractTextFromAnthropicResponse(response: AnthropicMessageResponse): string {
  return response.content
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text ?? "")
    .join("");
}

export async function writeGeneratedArtifactWithAnthropic(
  sourceFile: SourceFile,
  specFilePath: string,
  options: AnthropicGenerateOptions = {}
): Promise<AnthropicGenerationResult> {
  const apiKey = options.apiKey ?? process.env["ANTHROPIC_API_KEY"];

  if (!options.client && !apiKey) {
    throw new Error("Missing Anthropic API key. Set ANTHROPIC_API_KEY or pass apiKey explicitly.");
  }

  const promptText = renderPrompt(sourceFile, {
    ...(options.style === undefined ? {} : { style: options.style }),
    ...(options.includeSourceAppendix === undefined
      ? {}
      : { includeSourceAppendix: options.includeSourceAppendix })
  });
  const model = options.model ?? DEFAULT_ANTHROPIC_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_ANTHROPIC_MAX_TOKENS;
  const client =
    options.client ??
    new Anthropic({
      apiKey
    });
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [
      {
        role: "user",
        content: promptText
      }
    ]
  });
  const rawResponseText = extractTextFromAnthropicResponse(response);

  if (rawResponseText.trim().length === 0) {
    throw new Error("Anthropic returned an empty response.");
  }

  const artifactText = sanitizeGeneratedArtifact(rawResponseText);
  const outFile = options.outFile ?? getDefaultGeneratedArtifactPath(sourceFile, specFilePath);

  writeFileSync(outFile, artifactText, "utf8");

  return {
    artifactText,
    model,
    outFile,
    promptText,
    rawResponseText
  };
}
