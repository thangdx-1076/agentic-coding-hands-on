"use client";

import { useState } from "react";

import {
  insertMarkdownMarker,
  type MarkdownMarkerKind,
} from "../_utils/insert-markdown-marker";

import {
  deriveMentionQuery,
  insertMentionText,
} from "./kudos-compose-form-rules";
import { useSunnerSuggest } from "./use-sunner-suggest";

import type { SunnerSuggestion } from "@/dal/sunner-search";

export type KudosComposeContent = {
  content: string;
  setContent: (value: string, caret?: number) => void;
  applyFormat: (
    format: MarkdownMarkerKind,
    textarea: HTMLTextAreaElement,
    url?: string,
    linkText?: string,
  ) => void;
  mentionQuery: string | null;
  mentionOptions: SunnerSuggestion[];
  mentionLoading: boolean;
  insertMention: (option: SunnerSuggestion) => void;
  reset: () => void;
};

/**
 * The Nội dung textarea's whole state machine (D, C.1-6, ID-33): plain
 * text + caret, the format toolbar (BR-005, via `insertMarkdownMarker`),
 * and `@`-mention suggestions built on `useSunnerSuggest`. Split out of
 * `use-kudos-compose-form.ts` purely to keep that orchestrator hook under
 * 200 lines — see the phase's decisions report for the full rationale.
 */
export function useKudosComposeContent(): KudosComposeContent {
  const [content, setContentState] = useState("");
  const [caret, setCaret] = useState(0);

  const mentionQuery = deriveMentionQuery(content, caret);
  const { options: mentionOptions, loading: mentionLoading } = useSunnerSuggest(
    mentionQuery,
    { enabled: mentionQuery !== null },
  );

  function setContent(value: string, nextCaret: number = value.length): void {
    setContentState(value);
    setCaret(nextCaret);
  }

  function applyFormat(
    format: MarkdownMarkerKind,
    textarea: HTMLTextAreaElement,
    url?: string,
    linkText?: string,
  ): void {
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const result = insertMarkdownMarker(
      content,
      start,
      end,
      format,
      url,
      linkText,
    );
    // The DOM's `.value` is mutated FIRST, imperatively — React hasn't
    // re-rendered with the new `content` yet at this point in the same
    // synchronous handler, so calling `setSelectionRange` against the
    // STILL-OLD (shorter) string would have the browser clamp the new
    // selection to the old length. React's next render then just re-sets
    // `.value` to this same string, a no-op that leaves the selection set
    // here untouched.
    textarea.value = result.value;
    textarea.setSelectionRange(result.selectionStart, result.selectionEnd);
    setContent(result.value, result.selectionStart);
  }

  function insertMention(option: SunnerSuggestion): void {
    const result = insertMentionText(content, caret, option.fullName);
    setContent(result.value, result.caret);
  }

  function reset(): void {
    setContentState("");
    setCaret(0);
  }

  return {
    content,
    setContent,
    applyFormat,
    mentionQuery,
    mentionOptions,
    mentionLoading,
    insertMention,
    reset,
  };
}
