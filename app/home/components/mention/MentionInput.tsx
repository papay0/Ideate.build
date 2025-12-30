"use client";

/**
 * MentionInput Component
 *
 * A rich text input with @mention support using TipTap.
 * Handles cursor positioning, styled badges, and autocomplete automatically.
 */

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { cn } from "@/lib/utils";
import { type ScreenInfo } from "@/app/home/lib/mention-utils";
import { MentionList, MentionListRef } from "./MentionList";
import styles from "./MentionInput.module.css";

interface MentionInputProps {
  value?: string | null;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
  screens?: ScreenInfo[] | null;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  autoFocus?: boolean;
}

export interface MentionInputRef {
  focus: () => void;
  textarea: HTMLTextAreaElement | null;
}

// Convert TipTap JSON content to plain text with @mentions
function editorToPlainText(editor: ReturnType<typeof useEditor>): string {
  if (!editor) return "";

  let text = "";
  editor.state.doc.descendants((node) => {
    if (node.type.name === "text") {
      text += node.text;
    } else if (node.type.name === "mention") {
      text += `@${node.attrs.label || node.attrs.id}`;
    } else if (node.type.name === "paragraph") {
      if (text.length > 0 && !text.endsWith("\n")) {
        text += "\n";
      }
    }
  });

  return text.trim();
}

// Convert plain text with @mentions to TipTap-compatible content
function plainTextToContent(
  text: string,
  screens: { id: string; name: string }[]
): string {
  if (!text) return "";

  // Sort screens by name length (longest first) for matching
  const sortedScreens = [...screens].sort(
    (a, b) => b.name.length - a.name.length
  );

  let result = text;

  // Replace @ScreenName with TipTap mention markers
  for (const screen of sortedScreens) {
    const regex = new RegExp(
      `@${escapeRegex(screen.name)}(?=[\\s.,!?;:\\-)\\n]|$)`,
      "gi"
    );
    result = result.replace(regex, `<mention-placeholder id="${screen.id}" label="${screen.name}" />`);
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(
  function MentionInput(props, ref) {
    const value = props.value ?? "";
    const screens = props.screens ?? [];
    const onChange = props.onChange;
    const onKeyDown = props.onKeyDown;
    const onPaste = props.onPaste;
    const placeholder = props.placeholder ?? "";
    const disabled = props.disabled ?? false;
    const className = props.className;
    const autoFocus = props.autoFocus ?? false;

    const containerRef = useRef<HTMLDivElement>(null);

    // Use ref for screens data so suggestion always has latest
    const screensRef = useRef<{ id: string; name: string }[]>([]);

    // Update ref whenever screens change
    useEffect(() => {
      screensRef.current = screens
        .filter((s) => s && typeof s.name === "string" && s.name.length > 0)
        .map((s) => ({ id: s.id || s.name, name: s.name }));
    }, [screens]);

    // Create suggestion configuration (stable reference, reads from ref)
    const suggestion = useMemo(
      () => ({
        items: ({ query }: { query: string }) => {
          return screensRef.current
            .filter((item) =>
              item.name.toLowerCase().startsWith(query.toLowerCase())
            )
            .slice(0, 5);
        },
        render: () => {
          let component: ReactRenderer<MentionListRef> | null = null;
          let popup: TippyInstance[] | null = null;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(MentionList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) return;

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },

            onUpdate(props: any) {
              component?.updateProps(props);

              if (!props.clientRect) return;

              popup?.[0]?.setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown(props: any) {
              if (props.event.key === "Escape") {
                popup?.[0]?.hide();
                return true;
              }

              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit() {
              popup?.[0]?.destroy();
              component?.destroy();
            },
          };
        },
      }),
      [] // Stable - reads from screensRef.current
    );

    const editor = useEditor({
      immediatelyRender: false, // Required for Next.js SSR
      extensions: [
        StarterKit.configure({
          // Disable features we don't need
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
          emptyNodeClass: "is-empty",
        }),
        Mention.configure({
          HTMLAttributes: {
            class: "mention",
          },
          suggestion,
          renderText({ node }) {
            return `@${node.attrs.label ?? node.attrs.id}`;
          },
        }),
      ],
      content: value || "",
      editable: !disabled,
      onUpdate: ({ editor }) => {
        const plainText = editorToPlainText(editor);
        onChange(plainText);
      },
      editorProps: {
        attributes: {
          class: styles.editor,
          // Disable Grammarly and other writing assistants
          "data-gramm": "false",
          "data-gramm_editor": "false",
          "data-enable-grammarly": "false",
          "grammarly-desktop-disable": "true",
          "aria-multiline": "false",
          "autocomplete": "off",
          "autocorrect": "off",
          "autocapitalize": "off",
          "spellcheck": "false",
        },
        handleKeyDown: (view, event) => {
          // Forward Enter key to parent for form submission
          if (event.key === "Enter" && !event.shiftKey) {
            // Check if mention dropdown is open
            const mentionDropdown = document.querySelector('[data-tippy-root]');
            if (!mentionDropdown) {
              // Create a synthetic event for the parent handler
              const syntheticEvent = {
                key: event.key,
                shiftKey: event.shiftKey,
                preventDefault: () => event.preventDefault(),
                stopPropagation: () => event.stopPropagation(),
              } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;

              onKeyDown?.(syntheticEvent);
              return true;
            }
          }
          return false;
        },
        handlePaste: (view, event) => {
          if (onPaste) {
            onPaste(event as unknown as React.ClipboardEvent);
          }
          return false;
        },
      },
    });

    // Sync external value changes
    useEffect(() => {
      if (editor && value !== editorToPlainText(editor)) {
        editor.commands.setContent(value || "");
      }
    }, [value, editor]);

    // Auto-focus on mount if requested
    useEffect(() => {
      if (autoFocus && editor && !disabled) {
        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
          editor.commands.focus();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [autoFocus, editor, disabled]);

    // Forcibly disable Grammarly on the contenteditable element
    useEffect(() => {
      if (!containerRef.current) return;

      const proseMirror = containerRef.current.querySelector('.ProseMirror');
      if (proseMirror) {
        proseMirror.setAttribute('data-gramm', 'false');
        proseMirror.setAttribute('data-gramm_editor', 'false');
        proseMirror.setAttribute('data-enable-grammarly', 'false');
        proseMirror.setAttribute('grammarly-desktop-disable', 'true');
        proseMirror.setAttribute('data-lt-active', 'false');
        proseMirror.setAttribute('spellcheck', 'false');
        proseMirror.setAttribute('autocomplete', 'off');
        proseMirror.setAttribute('autocorrect', 'off');
        proseMirror.setAttribute('autocapitalize', 'off');
      }
    }, [editor]);

    // Expose ref methods
    useImperativeHandle(ref, () => ({
      focus: () => {
        editor?.commands.focus();
      },
      // TipTap doesn't use textarea, but keep for compatibility
      textarea: containerRef.current?.querySelector(".ProseMirror") as HTMLTextAreaElement | null,
    }));

    return (
      <div
        ref={containerRef}
        className={cn(styles.mentionContainer, className)}
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        data-lt-active="false"
        suppressContentEditableWarning
      >
        <EditorContent
          editor={editor}
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
        />
      </div>
    );
  }
);
