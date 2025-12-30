"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./MentionInput.module.css";

export interface MentionListProps {
  items: { id: string; name: string }[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList({ items, command }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command({ id: item.id, label: item.name });
      }
    };

    const upHandler = () => {
      setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((prev) => (prev + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className={styles.mentionDropdown}>
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No matching screens</p>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.mentionDropdown}>
        <div className={styles.suggestionsScroll}>
          {items.map((item, index) => (
            <button
              key={item.id}
              onClick={() => selectItem(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                styles.suggestionItem,
                index === selectedIndex && styles.suggestionItemSelected
              )}
            >
              <div
                className={cn(
                  styles.suggestionIcon,
                  index === selectedIndex && styles.suggestionIconFocused
                )}
              >
                <Layers className="w-4 h-4" />
              </div>
              <span
                className={cn(
                  styles.suggestionText,
                  index === selectedIndex && styles.suggestionTextFocused
                )}
              >
                {item.name}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.keyboardHints}>
          <p className={styles.keyboardHintsText}>
            <kbd className={styles.kbd}>↑↓</kbd>
            <span className={styles.hintLabel}>navigate</span>
            <kbd className={styles.kbd}>↵</kbd>
            <span className={styles.hintLabel}>select</span>
            <kbd className={styles.kbd}>esc</kbd>
            <span className={styles.hintLabel}>close</span>
          </p>
        </div>
      </div>
    );
  }
);
