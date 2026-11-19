"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, ArrowRight, Loader2 } from "lucide-react";
import { createRoom, isSupabaseConfigured } from "@/lib/supabase";
import { Logo } from "@/components/Logo";

const QUICK_PRESETS = [
  {
    label: "Dinner",
    title: "Where are we eating tonight?",
    options: ["Street Tacos & Margaritas", "Tonkotsu Ramen", "Wood-Fired Pizza", "Thai Curry Spot"],
  },
  {
    label: "Movie night",
    title: "What are we watching?",
    options: ["Dune: Part Two", "Everything Everywhere All at Once", "Spider-Verse", "Knives Out"],
  },
  {
    label: "Game night",
    title: "Which game are we playing first?",
    options: ["Mario Kart 8", "Jackbox Party Pack", "Overcooked 2", "Super Smash Bros"],
  },
];

const OPTION_PLACEHOLDERS = [
  "e.g., Tacos El Gordo",
  "e.g., Spicy Tonkotsu Ramen",
  "e.g., Wood-Fired Neapolitan Pizza",
  "e.g., Korean BBQ",
  "e.g., Smash Burgers & Shakes",
  "e.g., Sushi & Izakaya",
  "e.g., Thai Street Noodles",
  "e.g., Mediterranean Mezze",
  "e.g., Dim Sum House",
  "e.g., Late-Night Diner",
];

export default function HomePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  const supabaseLive = isSupabaseConfigured();

  const handleOptionChange = (index: number, value: string) => {
    setError(null);
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddOption = () => {
    if (options.length >= 10) return;
    setError(null);
    setOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    setError(null);
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const applyPreset = (preset: (typeof QUICK_PRESETS)[number]) => {
    setError(null);
    setTitle(preset.title);
    setOptions([...preset.options]);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Enter a room title, e.g. \"Where are we eating?\"");
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
      {/* Top bar */}
      <header className="mb-5 flex h-9 items-center justify-between">
        <Logo />
        <span
          title={
            supabaseLive
              ? "Connected to Supabase via .env.local"
              : "Running on local storage. Add Supabase keys to .env.local for the cloud database."
          }
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500"
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              supabaseLive ? "bg-accent" : "bg-zinc-600"
            }`}
          />
          {supabaseLive ? "Supabase" : "Local"}
        </span>
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

        {/* Quick fill */}
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1">
          <span className="flex shrink-0 items-center font-mono text-[11px] uppercase tracking-wider text-zinc-600">
            Quick fill
          </span>
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className="shrink-0 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-ink"
            >
              {preset.label}
            </button>
          ))}
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
                <div key={index} className="flex items-center gap-2 animate-fade-in">
                  <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-zinc-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <input
                    type="text"
                    value={option}
                    maxLength={80}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={OPTION_PLACEHOLDERS[index] || `Option ${index + 1}`}
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
