"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, ArrowRight, Loader2, Shuffle } from "lucide-react";
import { createRoom } from "@/lib/supabase";
import {
  QUICK_FILL_CATEGORIES,
  QuickFillCategoryId,
  detectCategoryFromTitle,
  pickQuickFillOptions,
} from "@/lib/quickFill";
import { Logo } from "@/components/Logo";

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  // Track which options were explicitly typed/edited by the user so Shuffle preserves them
  const [manualOptionSet, setManualOptionSet] = useState<Set<string>>(
    new Set()
  );
  const [selectedCategory, setSelectedCategory] =
    useState<QuickFillCategoryId>("auto");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  const detectedCategory = useMemo(
    () => detectCategoryFromTitle(title),
    [title]
  );

  const detectedCategoryLabel = useMemo(() => {
    const found = QUICK_FILL_CATEGORIES.find((c) => c.id === detectedCategory);
    return found ? found.pillLabel : "Wildcard";
  }, [detectedCategory]);

  const handleOptionChange = (index: number, value: string) => {
    setError(null);
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    const trimmed = value.trim();
    if (trimmed) {
      setManualOptionSet((prev) => {
        const next = new Set(prev);
        next.add(trimmed.toLowerCase());
        return next;
      });
    }
  };

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setError(null);
    setOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setError(null);
    setOptions((prev) => {
      const removed = prev[index]?.trim().toLowerCase();
      if (removed) {
        setManualOptionSet((s) => {
          const next = new Set(s);
          next.delete(removed);
          return next;
        });
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleShuffleQuickFill = (
    overrideCategory?: QuickFillCategoryId
  ) => {
    setError(null);
    const activeCat = overrideCategory ?? selectedCategory;

    // Collect all current non-empty options in the room so none of them are duplicated
    const currentNonEmpty = options.map((o) => o.trim()).filter(Boolean);

    // Keep any options the user manually typed
    const preservedManual = currentNonEmpty.filter((opt) =>
      manualOptionSet.has(opt.toLowerCase())
    );

    const slotsAvailable = Math.max(0, 10 - preservedManual.length);
    const pickCount = Math.min(4, slotsAvailable);

    const { resolvedCategory, options: picked } = pickQuickFillOptions({
      category: activeCat,
      roomTitle: title,
      existingOptions: currentNonEmpty,
      count: pickCount,
    });

    const nextOptions = [...preservedManual, ...picked];
    while (nextOptions.length < 2) {
      nextOptions.push("");
    }

    setOptions(nextOptions.slice(0, 10));

    // If the user hasn't typed a title yet, fill a clean matching question
    if (!title.trim()) {
      const meta = QUICK_FILL_CATEGORIES.find((c) => c.id === resolvedCategory);
      if (meta) {
        setTitle(meta.defaultTitle);
      }
    }
  };

  const handleSelectCategoryPill = (catId: QuickFillCategoryId) => {
    setSelectedCategory(catId);
    // If all current options are still blank, immediately populate 4 shuffled options
    const hasAnyOption = options.some((o) => o.trim().length > 0);
    if (!hasAnyOption && catId !== "auto") {
      handleShuffleQuickFill(catId);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError('Enter a room title, e.g. "Where are we eating?"');
      return;
    }

    const filledOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filledOptions.length < 2) {
      setError("Enter at least 2 options to vote on.");
      return;
    }

    if (filledOptions.length > 10) {
      setError("A room can have at most 10 options.");
      return;
    }

    setIsCreating(true);
    try {
      const { code } = await createRoom(cleanTitle, filledOptions);
      router.push(`/room/${code}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the room.";
      setError(msg);
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = joinCode.trim().toUpperCase();
    if (cleaned.length > 0) {
      router.push(`/room/${cleaned}`);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-8 pt-4 sm:pt-8">
      {/* Clean Consumer Top Bar (No developer DB status clutter) */}
      <header className="mb-5 flex h-9 items-center justify-between">
        <Logo />
      </header>

      {/* Hero */}
      <section className="mb-5">
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-3xl">
          Kill the &ldquo;I don&apos;t care, you pick&rdquo; loop.
        </h1>
        <p className="mt-2 text-sm leading-snug text-zinc-400">
          Add options, share the link, everyone votes. Highest score wins.
        </p>
      </section>

      {/* Create a Room */}
      <section className="rounded-xl border border-line bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-ink">
            Create a Room
          </h2>
          <span className="font-mono text-xs tabular-nums text-zinc-500">
            {options.length} / 10
          </span>
        </div>

        <form onSubmit={handleCreateRoom} className="space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="room-title"
              className="mb-1.5 block text-xs font-medium text-zinc-400"
            >
              Room title
            </label>
            <input
              id="room-title"
              type="text"
              required
              maxLength={100}
              value={title}
              onChange={(e) => {
                setError(null);
                setTitle(e.target.value);
              }}
              placeholder="Where are we eating?"
              className="h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-[15px] text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500"
            />
          </div>

          {/* Smart Randomized Quick-Fill Engine Controls */}
          <div className="rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-3">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  Smart Quick-Fill
                </span>
                {selectedCategory === "auto" && title.trim().length > 0 && (
                  <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    {detectedCategoryLabel}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleShuffleQuickFill()}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 text-xs font-medium text-ink transition-colors hover:border-zinc-500 hover:bg-zinc-800 active:opacity-80"
              >
                <Shuffle className="h-3.5 w-3.5" />
                <span>Shuffle Quick-Fill</span>
              </button>
            </div>

            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
              {QUICK_FILL_CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategoryPill(cat.id)}
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? "border-zinc-400 bg-zinc-800 text-white"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-ink"
                    }`}
                  >
                    {cat.pillLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Options */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-medium text-zinc-400">
                Options
              </label>
              <span className="font-mono text-[11px] text-zinc-600">
                min 2 &middot; max 10
              </span>
            </div>

            <div className="space-y-2">
              {options.map((option, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 animate-fade-in"
                >
                  <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-zinc-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <input
                    type="text"
                    value={option}
                    maxLength={80}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    aria-label={`Option ${index + 1}`}
                    className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-[15px] text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length <= 2}
                    aria-label={`Remove option ${index + 1}`}
                    title={
                      options.length <= 2
                        ? "At least 2 options are required"
                        : "Remove option"
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line text-zinc-500 transition-colors hover:border-zinc-600 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-zinc-500"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddOption}
              disabled={options.length >= 10}
              className="mt-2 flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-700 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              <span>
                {options.length >= 10 ? "Maximum 10 options" : "Add Option"}
              </span>
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isCreating}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#D4FF00] text-[15px] font-semibold text-black transition-colors hover:bg-[#c3eb00] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#D4FF00]"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating room...</span>
              </>
            ) : (
              <>
                <span>Create Room</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </section>

      {/* Join existing room */}
      <form
        onSubmit={handleJoinRoom}
        className="mt-4 flex items-center gap-2 border-t border-line pt-4"
      >
        <label
          htmlFor="join-code"
          className="shrink-0 text-xs font-medium text-zinc-500"
        >
          Have a code?
        </label>
        <input
          id="join-code"
          type="text"
          maxLength={6}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="K7M9P2"
          className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 font-mono text-sm uppercase tabular-nums tracking-[0.2em] text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500"
        />
        <button
          type="submit"
          disabled={!joinCode.trim()}
          className="h-11 rounded-lg border border-zinc-700 px-4 text-sm font-medium text-ink transition-colors hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Join
        </button>
      </form>
    </main>
  );
}
