"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Copy,
  Check,
  Share2,
  QrCode,
  X,
  Trash2,
  ArrowLeft,
  RotateCcw,
  Dices,
  ChevronLeft,
  UserPlus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  Room,
  RoomOption,
  Vote,
  VotePoints,
  getRoomBundleByCode,
  fetchRoomLiveState,
  castOptionVote,
  persistRoomWinner,
  deleteRoomOption,
  isHostForRoom,
  subscribeToRoomRealtime,
} from "@/lib/supabase";
import { generateQrMatrix } from "@/lib/qrCode";

const DISPLAY_NAME_STORAGE_KEY = "decide_for_us_display_name";

interface LeaderboardEntry {
  option: RoomOption;
  totalPoints: number;
  mustDoCount: number;
  downCount: number;
  passCount: number;
  voters: Array<{ name: string; points: VotePoints }>;
}

export default function RoomVotingPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const roomCode = (params?.code || "").toString().toUpperCase();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [options, setOptions] = useState<RoomOption[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [mode, setMode] = useState<"supabase" | "local">("supabase");
  const [isHost, setIsHost] = useState<boolean>(false);

  // Display Name state (persisted in localStorage)
  const [displayName, setDisplayName] = useState<string>("");
  const [nameInput, setNameInput] = useState<string>("");
  const [isNameConfirmed, setIsNameConfirmed] = useState<boolean>(false);

  // Card-by-card voting state
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isSubmittingVote, setIsSubmittingVote] = useState<boolean>(false);
  const [hasFinishedVoting, setHasFinishedVoting] = useState<boolean>(false);

  // Share, Toast & QR Modal state
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [roomUrl, setRoomUrl] = useState<string>("");

  // Synced Tie-breaker / Final Winner state
  const [syncedWinnerId, setSyncedWinnerId] = useState<string | null>(null);
  const [rouletteHighlightId, setRouletteHighlightId] = useState<string | null>(
    null
  );
  const [isSpinningTieBreaker, setIsSpinningTieBreaker] =
    useState<boolean>(false);
  const [deletingOptionId, setDeletingOptionId] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Load saved Display Name & Host status from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    setRoomUrl(window.location.href);
    if (roomCode) {
      setIsHost(isHostForRoom(roomCode));
    }
    const saved = window.localStorage.getItem(DISPLAY_NAME_STORAGE_KEY);
    if (saved && saved.trim()) {
      const cleaned = saved.trim();
      setDisplayName(cleaned);
      setNameInput(cleaned);
      setIsNameConfirmed(true);
    }
  }, [roomCode]);

  // Load Room, Options, Votes, and Synced Winner
  const loadRoomData = useCallback(async () => {
    if (!roomCode) return;
    setLoading(true);
    const bundle = await getRoomBundleByCode(roomCode);
    if (!bundle) {
      setRoom(null);
      setLoading(false);
      return;
    }

    setRoom(bundle.room);
    setOptions(bundle.options);
    setVotes(bundle.votes);
    setSyncedWinnerId(bundle.winnerOptionId);
    setMode(bundle.mode);
    setLoading(false);
  }, [roomCode]);

  useEffect(() => {
    loadRoomData();
  }, [loadRoomData]);

  // Check if the current user has already voted on all active options in this room
  useEffect(() => {
    if (!isNameConfirmed || !displayName || options.length === 0) return;

    const myVotes = votes.filter(
      (v) => v.voter_name.toLowerCase() === displayName.trim().toLowerCase()
    );

    if (myVotes.length >= options.length) {
      setHasFinishedVoting(true);
    }
  }, [isNameConfirmed, displayName, options.length, votes]);

  // Keep currentCardIndex within bounds if host deletes an option
  useEffect(() => {
    if (options.length > 0 && currentCardIndex >= options.length) {
      setCurrentCardIndex(options.length - 1);
    }
  }, [options.length, currentCardIndex]);

  // Subscribe to Realtime updates (votes, option deletions, synced winner decisions)
  useEffect(() => {
    if (!room?.id) return;

    const refreshLiveState = async () => {
      const latest = await fetchRoomLiveState(room.id, mode);
      if (latest) {
        setOptions(latest.options);
        setVotes(latest.votes);
        setSyncedWinnerId(latest.winnerOptionId);
      }
    };

    const unsubscribe = subscribeToRoomRealtime(room.id, refreshLiveState);
    return () => {
      unsubscribe();
    };
  }, [room?.id, mode]);

  const copyUrlToClipboard = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    showToast("Invite link copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareInvite = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const isMobileDevice =
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches &&
        window.innerWidth < 768);

    if (
      isMobileDevice &&
      typeof navigator.share === "function" &&
      room
    ) {
      try {
        await navigator.share({
          title: `Decide For Us: ${room.title}`,
          text: `Vote on "${room.title}" (${room.code})`,
          url,
        });
        showToast("Shared invite link");
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }

    await copyUrlToClipboard();
  };

  const handleConfirmDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = nameInput.trim();
    if (!cleaned) return;
    setDisplayName(cleaned);
    setIsNameConfirmed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISPLAY_NAME_STORAGE_KEY, cleaned);
    }

    const existingForVoter = votes.filter(
      (v) => v.voter_name.toLowerCase() === cleaned.toLowerCase()
    );
    if (existingForVoter.length < options.length) {
      setCurrentCardIndex(0);
      setHasFinishedVoting(false);
    }
  };

  const handleSwitchVoter = () => {
    setIsNameConfirmed(false);
    setNameInput("");
    setDisplayName("");
    setCurrentCardIndex(0);
    setHasFinishedVoting(false);
  };

  const handleVoteOnCurrentCard = async (points: VotePoints) => {
    if (!room || isSubmittingVote) return;
    const currentOption = options[currentCardIndex];
    if (!currentOption) return;

    setIsSubmittingVote(true);

    try {
      const savedVote = await castOptionVote({
        roomId: room.id,
        optionId: currentOption.id,
        voterName: displayName,
        points,
        mode,
      });

      setVotes((prev) => {
        const filtered = prev.filter(
          (v) =>
            !(
              v.option_id === currentOption.id &&
              v.voter_name.toLowerCase() === displayName.toLowerCase()
            )
        );
        return [...filtered, savedVote];
      });

      if (currentCardIndex + 1 < options.length) {
        setCurrentCardIndex((prev) => prev + 1);
      } else {
        setHasFinishedVoting(true);
      }
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Host Option Cleanup handler
  const handleHostDeleteOption = async (optionToDelete: RoomOption) => {
    if (!room || !isHost || deletingOptionId) return;
    if (options.length <= 2) {
      showToast("A room must keep at least 2 options");
      return;
    }

    setDeletingOptionId(optionToDelete.id);
    try {
      await deleteRoomOption({
        roomId: room.id,
        optionId: optionToDelete.id,
        mode,
      });

      setOptions((prev) => prev.filter((o) => o.id !== optionToDelete.id));
      setVotes((prev) =>
        prev.filter((v) => v.option_id !== optionToDelete.id)
      );
      if (syncedWinnerId === optionToDelete.id) {
        setSyncedWinnerId(null);
      }
      showToast(`Removed "${optionToDelete.label}"`);
    } finally {
      setDeletingOptionId(null);
    }
  };

  // Compute sorted Live Leaderboard
  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    return options
      .map((option) => {
        const optionVotes = votes.filter((v) => v.option_id === option.id);
        let totalPoints = 0;
        let mustDoCount = 0;
        let downCount = 0;
        let passCount = 0;
        const voters: Array<{ name: string; points: VotePoints }> = [];

        optionVotes.forEach((v) => {
          totalPoints += v.points;
          if (v.points === 2) mustDoCount++;
          else if (v.points === 1) downCount++;
          else passCount++;
          voters.push({ name: v.voter_name, points: v.points });
        });

        return {
          option,
          totalPoints,
          mustDoCount,
          downCount,
          passCount,
          voters,
        };
      })
      .sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }
        if (b.mustDoCount !== a.mustDoCount) {
          return b.mustDoCount - a.mustDoCount;
        }
        return a.option.position - b.option.position;
      });
  }, [options, votes]);

  // Unique participants who have cast at least one vote
  const uniqueVoters = useMemo(() => {
    const set = new Set<string>();
    votes.forEach((v) => set.add(v.voter_name));
    return Array.from(set);
  }, [votes]);

  // Highest score & tie detection
  const topScore = leaderboard.length > 0 ? leaderboard[0].totalPoints : 0;
  const tiedLeaders = useMemo(
    () =>
      topScore > 0
        ? leaderboard.filter((entry) => entry.totalPoints === topScore)
        : leaderboard,
    [leaderboard, topScore]
  );

  // Active winner option ID (during roulette animation or persisted synced winner)
  const activeWinnerOptionId = rouletteHighlightId || syncedWinnerId;
  const decidedWinnerEntry = useMemo(
    () =>
      syncedWinnerId
        ? leaderboard.find((e) => e.option.id === syncedWinnerId) || null
        : null,
    [leaderboard, syncedWinnerId]
  );

  // Synced Tie-Breaker & Winner Reveal roulette animation + database persistence
  const handleRunTieBreakerOrPickWinner = () => {
    if (!room || isSpinningTieBreaker || leaderboard.length === 0) return;

    // Candidate pool: top tied options if there is a tie, or all options with top score / top contenders
    const candidatePool =
      tiedLeaders.length >= 2 ? tiedLeaders : leaderboard;

    setIsSpinningTieBreaker(true);

    let ticks = 0;
    const maxTicks = 16;
    const interval = setInterval(async () => {
      const cycleEntry =
        candidatePool[ticks % candidatePool.length] ||
        candidatePool[Math.floor(Math.random() * candidatePool.length)];
      setRouletteHighlightId(cycleEntry.option.id);
      ticks++;

      if (ticks >= maxTicks) {
        clearInterval(interval);
        const finalWinner =
          candidatePool[Math.floor(Math.random() * candidatePool.length)];
        setRouletteHighlightId(null);
        setSyncedWinnerId(finalWinner.option.id);
        setIsSpinningTieBreaker(false);

        await persistRoomWinner({
          roomId: room.id,
          optionId: finalWinner.option.id,
          mode,
        });
        showToast(`Final decision: ${finalWinner.option.label}`);
      }
    }, 95);
  };

  // QR Matrix memoized for current room URL
  const qrMatrix = useMemo(() => {
    const targetUrl =
      roomUrl ||
      (typeof window !== "undefined"
        ? window.location.href
        : `http://localhost:3000/room/${roomCode}`);
    return generateQrMatrix(targetUrl);
  }, [roomUrl, roomCode]);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          <p className="text-sm text-zinc-400">
            Loading room{" "}
            <span className="font-mono tabular-nums tracking-widest text-ink">
              {roomCode}
            </span>
          </p>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4">
        <div className="w-full rounded-xl border border-line bg-surface p-6">
          <AlertCircle className="mb-4 h-5 w-5 text-red-400" />
          <h1 className="text-lg font-semibold tracking-tight text-ink">
            Room not found
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            No room exists with code{" "}
            <span className="font-mono tabular-nums tracking-widest text-ink">
              {roomCode}
            </span>
            .
          </p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent text-[15px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Create a New Room</span>
          </button>
        </div>
      </main>
    );
  }

  const currentOption = options[currentCardIndex];
  const maxPossiblePoints = Math.max(uniqueVoters.length * 2, 2);
  const progressPct = options.length
    ? ((currentCardIndex + 1) / options.length) * 100
    : 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-10 pt-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-fade-in rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-ink shadow-2xl"
        >
          {toastMessage}
        </div>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Room QR Code"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="w-full max-w-xs animate-fade-in rounded-xl border border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  Scan to join
                </div>
                <div className="font-mono text-lg font-semibold tabular-nums tracking-widest text-ink">
                  {room.code}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                aria-label="Close QR modal"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-zinc-400 transition-colors hover:border-zinc-600 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Crisp Inline SVG QR Code */}
            <div className="mx-auto flex aspect-square w-full max-w-[220px] items-center justify-center rounded-lg bg-white p-3.5">
              <svg
                viewBox={`0 0 ${qrMatrix.length} ${qrMatrix.length}`}
                className="h-full w-full"
                shapeRendering="crispEdges"
                role="img"
                aria-label={`QR code for room ${room.code}`}
              >
                {qrMatrix.map((row, rIdx) =>
                  row.map((isDark, cIdx) =>
                    isDark ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx}
                        y={rIdx}
                        width={1}
                        height={1}
                        fill="#09090B"
                      />
                    ) : null
                  )
                )}
              </svg>
            </div>

            <p className="mt-3 truncate text-center font-mono text-[11px] text-zinc-500">
              {roomUrl}
            </p>

            <button
              type="button"
              onClick={copyUrlToClipboard}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Room Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Top bar */}
      <header className="mb-5 flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>New</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            aria-label="Show Room QR Code"
            title="Show QR Code"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-surface text-zinc-200 transition-colors hover:border-zinc-600 hover:text-ink"
          >
            <QrCode className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleShareInvite}
            className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors active:opacity-80 ${
              copied
                ? "border border-accent bg-transparent text-accent"
                : "bg-ink text-black hover:bg-zinc-200"
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Link copied</span>
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                <span>Share Invite</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Room header */}
      <section className="mb-5 border-b border-line pb-5">
        <div className="mb-2 flex items-center justify-between font-mono text-xs tabular-nums text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-[0.2em] text-zinc-400">
              Room {room.code}
            </span>
            {isHost && (
              <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-300">
                Host
              </span>
            )}
          </div>
          <span>
            {uniqueVoters.length}{" "}
            {uniqueVoters.length === 1 ? "voter" : "voters"} &middot;{" "}
            {options.length} options
          </span>
        </div>

        <h1 className="text-2xl font-semibold leading-tight tracking-tight text-ink">
          {room.title}
        </h1>

        {isNameConfirmed && displayName && (
          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            <span className="text-zinc-400">
              Voting as{" "}
              <strong className="font-semibold text-ink">{displayName}</strong>
            </span>
            <button
              type="button"
              onClick={handleSwitchVoter}
              className="text-xs font-medium text-zinc-400 underline underline-offset-4 transition-colors hover:text-ink"
            >
              Switch voter
            </button>
          </div>
        )}
      </section>

      {/* STEP 1: Display name */}
      {!isNameConfirmed && (
        <section className="animate-fade-in rounded-xl border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            What&apos;s your name?
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Saved in your browser. No signup required.
          </p>

          <form onSubmit={handleConfirmDisplayName} className="mt-4 space-y-3">
            <input
              type="text"
              required
              autoFocus
              maxLength={32}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g., Alex"
              className="h-12 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-base text-white outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="flex h-12 w-full items-center justify-center rounded-lg bg-[#D4FF00] text-[15px] font-semibold text-black transition-colors hover:bg-[#c3eb00] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start Voting
            </button>
          </form>
        </section>
      )}

      {/* STEP 2: Card-by-card voting */}
      {isNameConfirmed && !hasFinishedVoting && currentOption && (
        <section className="animate-fade-in flex flex-1 flex-col">
          {/* Progress */}
          <div>
            <div className="mb-2 flex items-center justify-between font-mono text-xs tabular-nums text-zinc-500">
              <span>
                {String(currentCardIndex + 1).padStart(2, "0")} /{" "}
                {String(options.length).padStart(2, "0")}
              </span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-px w-full bg-line">
              <div
                className="h-px bg-accent transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Active card */}
          <div className="relative my-6 flex min-h-[200px] flex-1 flex-col justify-center rounded-xl border border-line bg-surface p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
                Option {String(currentCardIndex + 1).padStart(2, "0")}
              </span>
              {isHost && options.length > 2 && (
                <button
                  type="button"
                  disabled={deletingOptionId === currentOption.id}
                  onClick={() => handleHostDeleteOption(currentOption)}
                  title="Host: Remove this option from the room"
                  className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete option</span>
                </button>
              )}
            </div>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-ink">
              {currentOption.label}
            </h2>
          </div>

          {/* Vote buttons */}
          <div className="space-y-2">
            <button
              type="button"
              disabled={isSubmittingVote}
              onClick={() => handleVoteOnCurrentCard(2)}
              className="flex h-14 w-full items-center justify-between rounded-lg bg-[#D4FF00] px-5 text-black transition-colors hover:bg-[#c3eb00] active:opacity-80 disabled:opacity-60"
            >
              <span className="text-base font-semibold">Must Do</span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                +2
              </span>
            </button>

            <button
              type="button"
              disabled={isSubmittingVote}
              onClick={() => handleVoteOnCurrentCard(1)}
              className="flex h-14 w-full items-center justify-between rounded-lg border border-zinc-600 bg-zinc-900 px-5 text-ink transition-colors hover:border-zinc-400 active:bg-zinc-800 disabled:opacity-60"
            >
              <span className="text-base font-semibold">Down</span>
              <span className="font-mono text-sm tabular-nums text-zinc-300">
                +1
              </span>
            </button>

            <button
              type="button"
              disabled={isSubmittingVote}
              onClick={() => handleVoteOnCurrentCard(0)}
              className="flex h-14 w-full items-center justify-between rounded-lg border border-line px-5 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-ink active:bg-zinc-900 disabled:opacity-60"
            >
              <span className="text-base font-medium">Pass</span>
              <span className="font-mono text-sm tabular-nums text-zinc-500">
                0
              </span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              disabled={currentCardIndex === 0 || isSubmittingVote}
              onClick={() =>
                setCurrentCardIndex((prev) => Math.max(0, prev - 1))
              }
              className="inline-flex h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-zinc-400 transition-colors hover:text-ink disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => setHasFinishedVoting(true)}
              className="inline-flex h-11 items-center rounded-lg px-2 text-sm font-medium text-zinc-400 transition-colors hover:text-ink"
            >
              Skip to leaderboard
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: Live leaderboard */}
      {isNameConfirmed && hasFinishedVoting && (
        <section className="animate-fade-in space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-ink">
                Leaderboard
              </h2>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
                Live
              </span>
            </div>

            {/* Host or Tie-Breaker "Break Tie / Pick Winner" Action */}
            {(isHost || tiedLeaders.length > 1) && (
              <button
                type="button"
                onClick={handleRunTieBreakerOrPickWinner}
                disabled={isSpinningTieBreaker}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 text-xs font-medium text-ink transition-colors hover:border-zinc-500 disabled:opacity-50"
              >
                <Dices className="h-3.5 w-3.5 text-accent" />
                <span>
                  {isSpinningTieBreaker
                    ? "Picking..."
                    : tiedLeaders.length > 1
                    ? "Break Tie"
                    : syncedWinnerId
                    ? "Re-Pick Winner"
                    : "Decide Winner"}
                </span>
              </button>
            )}
          </div>

          {/* Synced Final Winner Reveal Banner */}
          {decidedWinnerEntry && !isSpinningTieBreaker && (
            <div className="animate-fade-in rounded-xl border border-accent bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-widest text-accent">
                    Final Decision &middot; Synced to Room
                  </div>
                  <div className="mt-1 text-xl font-semibold tracking-tight text-ink">
                    {decidedWinnerEntry.option.label}
                  </div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-2xl font-semibold tabular-nums text-accent">
                    {decidedWinnerEntry.totalPoints}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    {decidedWinnerEntry.totalPoints === 1 ? "pt" : "pts"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tie-breaker Prompt Banner when top options are tied and no winner has been picked yet */}
          {tiedLeaders.length > 1 && !decidedWinnerEntry && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-xs uppercase tracking-wider text-accent">
                    <span className="tabular-nums">{tiedLeaders.length}</span>
                    -way tie
                  </div>
                  <p className="mt-0.5 text-sm text-zinc-300">
                    Top options locked at{" "}
                    <span className="font-mono tabular-nums text-ink">
                      {topScore}
                    </span>{" "}
                    pts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunTieBreakerOrPickWinner}
                  disabled={isSpinningTieBreaker}
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-[#D4FF00] px-4 text-sm font-semibold text-black transition-colors hover:bg-[#c3eb00] disabled:opacity-60"
                >
                  <Dices className="h-4 w-4" />
                  <span>
                    {isSpinningTieBreaker
                      ? "Spinning..."
                      : "Break Tie / Pick Winner"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Entries */}
          <div className="space-y-2">
            {leaderboard.map((entry, index) => {
              const isFirstPlace = index === 0 && entry.totalPoints > 0;
              const isTiedForFirst =
                entry.totalPoints === topScore && topScore > 0;
              const isSelectedWinner =
                activeWinnerOptionId === entry.option.id;
              const highlight =
                isSelectedWinner || (isFirstPlace && !activeWinnerOptionId);
              const barPercent = Math.min(
                100,
                Math.round((entry.totalPoints / maxPossiblePoints) * 100)
              );

              return (
                <div
                  key={entry.option.id}
                  className={`rounded-xl border bg-surface p-4 transition-colors ${
                    highlight ? "border-accent" : "border-line"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`mt-0.5 font-mono text-sm tabular-nums ${
                          highlight ? "text-accent" : "text-zinc-600"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-semibold leading-snug tracking-tight text-ink">
                          {entry.option.label}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] tabular-nums text-zinc-500">
                          {syncedWinnerId === entry.option.id && (
                            <span className="rounded-sm bg-accent px-1.5 py-0.5 font-semibold uppercase text-black">
                              Winner
                            </span>
                          )}
                          {syncedWinnerId !== entry.option.id &&
                            isFirstPlace &&
                            tiedLeaders.length === 1 && (
                              <span className="rounded-sm bg-accent px-1.5 py-0.5 font-semibold uppercase text-black">
                                Leading
                              </span>
                            )}
                          {syncedWinnerId !== entry.option.id &&
                            isTiedForFirst &&
                            tiedLeaders.length > 1 && (
                              <span className="rounded-sm border border-zinc-700 px-1.5 py-0.5 uppercase text-zinc-300">
                                Tied 1st
                              </span>
                            )}
                          <span>{entry.mustDoCount} must</span>
                          <span className="text-zinc-700">&middot;</span>
                          <span>{entry.downCount} down</span>
                          <span className="text-zinc-700">&middot;</span>
                          <span>{entry.passCount} pass</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-start gap-2.5">
                      {isHost && options.length > 2 && (
                        <button
                          type="button"
                          disabled={deletingOptionId === entry.option.id}
                          onClick={() => handleHostDeleteOption(entry.option)}
                          aria-label={`Remove option ${entry.option.label}`}
                          title="Host: Delete option"
                          className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md border border-zinc-800 text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <div className="text-right">
                        <div
                          className={`font-mono text-3xl font-semibold leading-none tabular-nums tracking-tight ${
                            highlight ? "text-accent" : "text-ink"
                          }`}
                        >
                          {entry.totalPoints}
                        </div>
                        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
                          {entry.totalPoints === 1 ? "pt" : "pts"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="mt-3 h-px w-full bg-line">
                    <div
                      className={`h-px transition-all duration-500 ${
                        highlight ? "bg-accent" : "bg-zinc-500"
                      }`}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>

                  {/* Voter chips */}
                  {entry.voters.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {entry.voters.map((voter, vIdx) => (
                        <span
                          key={`${voter.name}-${vIdx}`}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] ${
                            voter.points === 2
                              ? "border-zinc-600 text-ink"
                              : voter.points === 1
                              ? "border-zinc-700 text-zinc-300"
                              : "border-line text-zinc-600"
                          }`}
                        >
                          <span>{voter.name}</span>
                          <span
                            className={`font-mono tabular-nums ${
                              voter.points === 2
                                ? "text-accent"
                                : "text-zinc-500"
                            }`}
                          >
                            {voter.points === 2
                              ? "+2"
                              : voter.points === 1
                              ? "+1"
                              : "0"}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentCardIndex(0);
                setHasFinishedVoting(false);
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Change votes</span>
            </button>

            <button
              type="button"
              onClick={handleSwitchVoter}
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-line text-sm font-medium text-zinc-200 transition-colors hover:border-zinc-600"
            >
              <UserPlus className="h-4 w-4" />
              <span>Another voter</span>
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
