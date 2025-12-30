/**
 * Mention Utilities
 *
 * Utilities for parsing and handling @screen mentions in chat input.
 * Supports screen names with spaces (e.g., "My Network").
 */

export interface ParsedMention {
  screenName: string;
  screenId?: string;
  startIndex: number;
  endIndex: number;
}

export interface ScreenInfo {
  name: string;
  id?: string;
}

/**
 * Parse all @mentions from text, matching against valid screen names.
 * Uses longest-match-first strategy to handle names with spaces.
 *
 * @example
 * parseMentions("Update @Home and @My Network", [{name: "Home"}, {name: "My Network"}])
 * // Returns: [{screenName: "Home", startIndex: 7, endIndex: 12}, {screenName: "My Network", startIndex: 17, endIndex: 28}]
 */
export function parseMentions(
  text: string,
  screens: ScreenInfo[]
): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  const validNames = screens.map((s) => s.name);

  // Sort by length descending to match longest names first
  // This ensures "My Network" matches before "My"
  const sortedNames = [...validNames].sort((a, b) => b.length - a.length);

  let i = 0;
  while (i < text.length) {
    if (text[i] === "@") {
      const afterAt = text.slice(i + 1);

      // Try to match a screen name (case-insensitive comparison, preserve original case)
      let matched = false;
      for (const name of sortedNames) {
        if (afterAt.toLowerCase().startsWith(name.toLowerCase())) {
          // Verify it's a word boundary (end of string, space, or punctuation)
          const endPos = i + 1 + name.length;
          const charAfter = text[endPos];
          const isWordBoundary =
            !charAfter || /[\s.,!?;:\-)]/.test(charAfter);

          if (isWordBoundary) {
            const screen = screens.find(
              (s) => s.name.toLowerCase() === name.toLowerCase()
            );
            mentions.push({
              screenName: screen?.name || name,
              screenId: screen?.id,
              startIndex: i,
              endIndex: endPos,
            });
            i = endPos;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        i++;
      }
    } else {
      i++;
    }
  }

  return mentions;
}

/**
 * Get the partial mention being typed at cursor position.
 * Returns null if cursor is not in a mention context.
 *
 * @example
 * getMentionAtCursor("Update @Ho", 10) // cursor at end
 * // Returns: { triggerIndex: 7, partial: "Ho" }
 */
export function getMentionAtCursor(
  text: string,
  cursorPosition: number
): { triggerIndex: number; partial: string } | null {
  // Look backwards from cursor for @
  let atIndex = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    const char = text[i];

    // Stop if we hit a space or newline before finding @
    if (char === " " || char === "\n") {
      // Check if there's an @ before this space (for multi-word names)
      // Keep looking...
    }

    if (char === "@") {
      atIndex = i;
      break;
    }

    // Stop if we've gone too far (more than 50 chars)
    if (cursorPosition - i > 50) {
      break;
    }
  }

  if (atIndex === -1) {
    return null;
  }

  // Get the text between @ and cursor
  const partial = text.slice(atIndex + 1, cursorPosition);

  // Don't trigger if there's a completed mention (check for word after the partial)
  // A mention is complete if followed by space/punctuation
  if (cursorPosition < text.length) {
    const charAfter = text[cursorPosition];
    // If we're in the middle of a word, don't trigger
    if (!/[\s.,!?;:\-)\n]/.test(charAfter)) {
      // We're typing in the middle of text, check if this looks like editing a mention
    }
  }

  return {
    triggerIndex: atIndex,
    partial,
  };
}

/**
 * Insert a mention at the trigger position, replacing any partial text.
 * Returns the new text and cursor position.
 */
export function insertMention(
  text: string,
  cursorPosition: number,
  screenName: string,
  triggerIndex: number
): { newText: string; newCursorPosition: number } {
  // Replace from @ to cursor with the full mention + space
  const before = text.slice(0, triggerIndex);
  const after = text.slice(cursorPosition);

  const mention = `@${screenName}`;
  const newText = before + mention + (after.startsWith(" ") ? "" : " ") + after;
  const newCursorPosition = triggerIndex + mention.length + 1; // +1 for space

  return { newText, newCursorPosition };
}

/**
 * Filter screens by partial name match (case-insensitive).
 */
export function filterScreensByPartial(
  screens: ScreenInfo[],
  partial: string
): ScreenInfo[] {
  const lowerPartial = partial.toLowerCase();
  return screens.filter((screen) =>
    screen.name.toLowerCase().startsWith(lowerPartial)
  );
}

/**
 * Build context string for AI with referenced screen IDs.
 *
 * @example
 * buildMentionContext([{screenName: "Home", screenId: "abc-123"}])
 * // Returns: "[Referenced screens: Home (id: abc-123)]"
 */
export function buildMentionContext(mentions: ParsedMention[]): string {
  if (mentions.length === 0) return "";

  const screenRefs = mentions
    .filter((m) => m.screenId)
    .map((m) => `${m.screenName} (id: ${m.screenId})`)
    .join(", ");

  if (!screenRefs) return "";

  return `\n[Referenced screens: ${screenRefs}]`;
}

/**
 * Extract screen ID from embedded comment in HTML.
 *
 * @example
 * extractScreenIdFromHtml("<!-- ideate.build.id = abc-123 --><div>...</div>")
 * // Returns: "abc-123"
 */
export function extractScreenIdFromHtml(html: string): string | null {
  const match = html.match(/<!--\s*ideate\.build\.id\s*=\s*([^\s]+)\s*-->/);
  return match ? match[1] : null;
}

/**
 * Embed screen ID as comment at the start of HTML.
 * Removes any existing ID comment first.
 */
export function embedScreenIdInHtml(html: string, id: string): string {
  // Remove existing ID comment if present
  const cleanHtml = html.replace(
    /<!--\s*ideate\.build\.id\s*=\s*[^\s]+\s*-->\s*/g,
    ""
  );

  return `<!-- ideate.build.id = ${id} -->\n${cleanHtml.trim()}`;
}
