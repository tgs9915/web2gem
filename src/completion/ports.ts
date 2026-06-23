import type { ResolvedModel } from "../models";
import type { AttachmentPlan } from "../attachments/types";
import type { AttachmentResolutionResult, FileRef } from "./types";

export type CompletionTextInput = {
  prompt: string;
  rm: ResolvedModel;
  fileRefs?: FileRef[] | null;
};

export type CompletionProviderOptions = {
  signal?: AbortSignal;
};

export type CompletionProvider = {
  generateText(input: CompletionTextInput): Promise<string>;
  streamText(input: CompletionTextInput, options?: CompletionProviderOptions): AsyncIterable<string>;
  resolveAttachments(plan: AttachmentPlan): Promise<AttachmentResolutionResult>;
  uploadTextFile(text: string, filename: string): Promise<FileRef>;
};
