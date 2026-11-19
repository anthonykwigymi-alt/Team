import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase issues "publishable" keys (sb_publishable_...) as well as legacy anon JWTs.
// Reference env vars literally so Next.js inlines them into the client bundle.
function readSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
}

function readSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();
}

const supabaseUrl =
  readSupabaseUrl() || "https://placeholder-project.supabase.co";
const supabaseAnonKey = readSupabaseKey() || "placeholder-anon-key";

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export function isSupabaseConfigured(): boolean {
  const url = readSupabaseUrl();
  const key = readSupabaseKey();
  const isValidKey =
    key.startsWith("sb_publishable_") || key.startsWith("eyJ");
  return (
    Boolean(url) &&
    Boolean(key) &&
    url.startsWith("https://") &&
    !url.includes("your-project-ref.supabase.co") &&
    !url.includes("placeholder-project.supabase.co") &&
    key !== "your-supabase-anon-key" &&
    key !== "placeholder-anon-key" &&
    isValidKey
  );
}

export type VotePoints = 0 | 1 | 2;

export interface Room {
  id: string;
  code: string;
  title: string;
  created_at: string;
}

export interface RoomOption {
  id: string;
  room_id: string;
  label: string;
  position: number;
  created_at: string;
}

export interface Vote {
  id: string;
  room_id: string;
  option_id: string;
  voter_name: string;
  points: VotePoints;
  created_at: string;
}

export interface RoomBundle {
  room: Room;
  options: RoomOption[];
  votes: Vote[];
  winnerOptionId: string | null;
  mode: "supabase" | "local";
}

// Sentinel voter names stored inside `public.votes` (with points = 0) so winner reveal
// and host option cleanup persist & broadcast via Realtime even on V1 database schemas.
export const SYSTEM_WINNER_VOTER = "__SYSTEM_WINNER__";
export const SYSTEM_DELETED_OPTION_VOTER = "__SYSTEM_DELETED_OPTION__";

export function isSystemVote(vote: Vote): boolean {
  return (
    vote.voter_name === SYSTEM_WINNER_VOTER ||
    vote.voter_name === SYSTEM_DELETED_OPTION_VOTER
  );
}

const LOCAL_STORAGE_ROOMS_KEY = "decide_for_us_local_rooms_v1";
const HOSTED_ROOMS_STORAGE_KEY = "decide_for_us_hosted_rooms_v1";
const BROADCAST_CHANNEL_NAME = "decide_for_us_realtime_channel";

interface LocalStore {
  rooms: Record<string, Room>;
  optionsByRoomId: Record<string, RoomOption[]>;
  votesByRoomId: Record<string, Vote[]>;
}

function readLocalStore(): LocalStore {
  if (typeof window === "undefined") {
    return { rooms: {}, optionsByRoomId: {}, votesByRoomId: {} };
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_ROOMS_KEY);
    if (!raw) {
      return { rooms: {}, optionsByRoomId: {}, votesByRoomId: {} };
    }
    return JSON.parse(raw) as LocalStore;
  } catch {
    return { rooms: {}, optionsByRoomId: {}, votesByRoomId: {} };
  }
}

function writeLocalStore(store: LocalStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_ROOMS_KEY, JSON.stringify(store));
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.postMessage({ type: "ROOM_UPDATED", timestamp: Date.now() });
      bc.close();
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Remembers in localStorage that the current browser created a room code.
 */
export function rememberHostForRoom(code: string): void {
  if (typeof window === "undefined") return;
  try {
    const clean = code.trim().toUpperCase();
    const existingRaw = window.localStorage.getItem(HOSTED_ROOMS_STORAGE_KEY);
    const list: string[] = existingRaw ? JSON.parse(existingRaw) : [];
    if (!list.includes(clean)) {
      list.push(clean);
      window.localStorage.setItem(
        HOSTED_ROOMS_STORAGE_KEY,
        JSON.stringify(list)
      );
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Checks whether the current browser is the host/creator of the specified room code.
 */
export function isHostForRoom(code: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const clean = code.trim().toUpperCase();
    const existingRaw = window.localStorage.getItem(HOSTED_ROOMS_STORAGE_KEY);
    if (!existingRaw) return false;
    const list: string[] = JSON.parse(existingRaw);
    return Array.isArray(list) && list.includes(clean);
  } catch {
    return false;
  }
}

function makeUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a short random 6-character uppercase room code (excluding ambiguous characters).
 */
export function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * alphabet.length);
    code += alphabet[idx];
  }
  return code;
}

/**
 * Filters raw options and votes to apply synced option deletions and extract the synced winner option ID.
 */
export function normalizeRoomState(
  rawOptions: RoomOption[],
  rawVotes: Vote[]
): {
  options: RoomOption[];
  votes: Vote[];
  winnerOptionId: string | null;
} {
  const deletedOptionIds = new Set<string>();
  let winnerVote: Vote | null = null;

  for (const v of rawVotes) {
    if (v.voter_name === SYSTEM_DELETED_OPTION_VOTER) {
      deletedOptionIds.add(v.option_id);
    } else if (v.voter_name === SYSTEM_WINNER_VOTER) {
      if (
        !winnerVote ||
        new Date(v.created_at).getTime() >=
          new Date(winnerVote.created_at).getTime()
      ) {
        winnerVote = v;
      }
    }
  }

  const activeOptions = rawOptions.filter(
    (opt) => !deletedOptionIds.has(opt.id)
  );
  const activeOptionIdSet = new Set(activeOptions.map((o) => o.id));

  const userVotes = rawVotes.filter(
    (v) => !isSystemVote(v) && activeOptionIdSet.has(v.option_id)
  );

  const winnerOptionId =
    winnerVote && activeOptionIdSet.has(winnerVote.option_id)
      ? winnerVote.option_id
      : null;

  return {
    options: activeOptions,
    votes: userVotes,
    winnerOptionId,
  };
}

/**
 * Creates a room and its options in Supabase (with automatic local fallback)
 * and marks the current user as the room host in localStorage.
 */
export async function createRoom(
  title: string,
  optionLabels: string[]
): Promise<{ code: string; room: Room; mode: "supabase" | "local" }> {
  const cleanTitle = title.trim();
  const cleanOptions = optionLabels.map((o) => o.trim()).filter(Boolean);
  const code = generateRoomCode();
  const now = new Date().toISOString();

  rememberHostForRoom(code);

  if (isSupabaseConfigured()) {
    try {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert({ code, title: cleanTitle })
        .select("*")
        .single();

      if (roomError || !roomData) {
        throw roomError || new Error("Failed to insert room into Supabase");
      }

      const optionsToInsert = cleanOptions.map((label, idx) => ({
        room_id: roomData.id,
        label,
        position: idx,
      }));

      const { data: insertedOptions, error: optionsError } = await supabase
        .from("options")
        .insert(optionsToInsert)
        .select("*");

      if (optionsError) {
        throw optionsError;
      }

      const store = readLocalStore();
      store.rooms[code] = roomData as Room;
      store.optionsByRoomId[roomData.id] = (insertedOptions ||
        []) as RoomOption[];
      store.votesByRoomId[roomData.id] = [];
      writeLocalStore(store);

      return { code, room: roomData as Room, mode: "supabase" };
    } catch (err) {
      console.warn(
        "Supabase insert failed, falling back to local mode so room creation still succeeds:",
        err
      );
    }
  }

  const roomId = makeUuid();
  const room: Room = {
    id: roomId,
    code,
    title: cleanTitle,
    created_at: now,
  };
  const options: RoomOption[] = cleanOptions.map((label, idx) => ({
    id: makeUuid(),
    room_id: roomId,
    label,
    position: idx,
    created_at: now,
  }));

  const store = readLocalStore();
  store.rooms[code] = room;
  store.optionsByRoomId[roomId] = options;
  store.votesByRoomId[roomId] = [];
  writeLocalStore(store);

  return { code, room, mode: "local" };
}

/**
 * Loads a room, its options, all current user votes, and any synced winner decision by 6-char room code.
 */
export async function getRoomBundleByCode(
  rawCode: string
): Promise<RoomBundle | null> {
  const code = rawCode.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    try {
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single();

      if (!roomError && roomData) {
        const [
          { data: optionsData, error: optionsError },
          { data: votesData, error: votesError },
        ] = await Promise.all([
          supabase
            .from("options")
            .select("*")
            .eq("room_id", roomData.id)
            .order("position", { ascending: true }),
          supabase
            .from("votes")
            .select("*")
            .eq("room_id", roomData.id)
            .order("created_at", { ascending: true }),
        ]);

        if (!optionsError && !votesError) {
          const normalized = normalizeRoomState(
            (optionsData || []) as RoomOption[],
            (votesData || []) as Vote[]
          );
          return {
            room: roomData as Room,
            options: normalized.options,
            votes: normalized.votes,
            winnerOptionId: normalized.winnerOptionId,
            mode: "supabase",
          };
        }
      }
    } catch (err) {
      console.warn("Supabase fetch error, checking local fallback:", err);
    }
  }

  const store = readLocalStore();
  const localRoom = store.rooms[code];
  if (!localRoom) {
    return null;
  }

  const normalized = normalizeRoomState(
    store.optionsByRoomId[localRoom.id] || [],
    store.votesByRoomId[localRoom.id] || []
  );

  return {
    room: localRoom,
    options: normalized.options,
    votes: normalized.votes,
    winnerOptionId: normalized.winnerOptionId,
    mode: "local",
  };
}

/**
 * Fetches latest options, votes, and synced winner for a given room ID.
 */
export async function fetchRoomLiveState(
  roomId: string,
  mode: "supabase" | "local"
): Promise<{
  options: RoomOption[];
  votes: Vote[];
  winnerOptionId: string | null;
} | null> {
  if (mode === "supabase" && isSupabaseConfigured()) {
    const [
      { data: optionsData, error: optionsError },
      { data: votesData, error: votesError },
    ] = await Promise.all([
      supabase
        .from("options")
        .select("*")
        .eq("room_id", roomId)
        .order("position", { ascending: true }),
      supabase
        .from("votes")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true }),
    ]);

    if (!optionsError && !votesError && optionsData && votesData) {
      return normalizeRoomState(
        optionsData as RoomOption[],
        votesData as Vote[]
      );
    }
  }

  const store = readLocalStore();
  return normalizeRoomState(
    store.optionsByRoomId[roomId] || [],
    store.votesByRoomId[roomId] || []
  );
}

/**
 * Saves a single option vote (or updates an existing vote by the same voter on the same option).
 */
export async function castOptionVote(params: {
  roomId: string;
  optionId: string;
  voterName: string;
  points: VotePoints;
  mode: "supabase" | "local";
}): Promise<Vote> {
  const { roomId, optionId, voterName, points, mode } = params;
  const cleanName = voterName.trim();
  const now = new Date().toISOString();

  if (mode === "supabase" && isSupabaseConfigured()) {
    try {
      const { data: existing } = await supabase
        .from("votes")
        .select("id")
        .eq("room_id", roomId)
        .eq("option_id", optionId)
        .eq("voter_name", cleanName)
        .maybeSingle();

      if (existing?.id) {
        const { data: updated, error: updateErr } = await supabase
          .from("votes")
          .update({ points })
          .eq("id", existing.id)
          .select("*")
          .single();

        if (!updateErr && updated) {
          return updated as Vote;
        }
      }

      const { data: inserted, error: insertErr } = await supabase
        .from("votes")
        .insert({
          room_id: roomId,
          option_id: optionId,
          voter_name: cleanName,
          points,
        })
        .select("*")
        .single();

      if (insertErr || !inserted) {
        throw insertErr || new Error("Failed to insert vote");
      }

      return inserted as Vote;
    } catch (err) {
      console.warn("Supabase vote insert failed, saving locally:", err);
    }
  }

  const store = readLocalStore();
  const existingVotes = store.votesByRoomId[roomId] || [];
  const existingIdx = existingVotes.findIndex(
    (v) =>
      v.option_id === optionId &&
      v.voter_name.toLowerCase() === cleanName.toLowerCase()
  );

  let savedVote: Vote;
  if (existingIdx >= 0) {
    savedVote = {
      ...existingVotes[existingIdx],
      points,
      created_at: now,
    };
    existingVotes[existingIdx] = savedVote;
  } else {
    savedVote = {
      id: makeUuid(),
      room_id: roomId,
      option_id: optionId,
      voter_name: cleanName,
      points,
      created_at: now,
    };
    existingVotes.push(savedVote);
  }

  store.votesByRoomId[roomId] = existingVotes;
  writeLocalStore(store);
  return savedVote;
}

/**
 * Persists and broadcasts the winning option ID (from a tie-breaker or host "Decide Winner" action)
 * so every connected device sees the exact same final decision.
 */
export async function persistRoomWinner(params: {
  roomId: string;
  optionId: string;
  mode: "supabase" | "local";
}): Promise<void> {
  const { roomId, optionId, mode } = params;
  const now = new Date().toISOString();

  if (mode === "supabase" && isSupabaseConfigured()) {
    try {
      const { data: existing } = await supabase
        .from("votes")
        .select("id")
        .eq("room_id", roomId)
        .eq("voter_name", SYSTEM_WINNER_VOTER)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from("votes")
          .update({ option_id: optionId, points: 0 })
          .eq("id", existing.id);
      } else {
        await supabase.from("votes").insert({
          room_id: roomId,
          option_id: optionId,
          voter_name: SYSTEM_WINNER_VOTER,
          points: 0,
        });
      }
    } catch (err) {
      console.warn("Failed to persist winner in Supabase:", err);
    }
  }

  const store = readLocalStore();
  const existingVotes = (store.votesByRoomId[roomId] || []).filter(
    (v) => v.voter_name !== SYSTEM_WINNER_VOTER
  );
  existingVotes.push({
    id: makeUuid(),
    room_id: roomId,
    option_id: optionId,
    voter_name: SYSTEM_WINNER_VOTER,
    points: 0,
    created_at: now,
  });
  store.votesByRoomId[roomId] = existingVotes;
  writeLocalStore(store);
}

/**
 * Host Option Cleanup: deletes a typo/spam option from the room and syncs across all devices.
 */
export async function deleteRoomOption(params: {
  roomId: string;
  optionId: string;
  mode: "supabase" | "local";
}): Promise<void> {
  const { roomId, optionId, mode } = params;
  const now = new Date().toISOString();

  if (mode === "supabase" && isSupabaseConfigured()) {
    try {
      // 1. Record a deletion sentinel in `votes` first so even if the database hasn't
      // applied a DELETE policy on `options`, all connected devices immediately hide the option.
      await supabase.from("votes").insert({
        room_id: roomId,
        option_id: optionId,
        voter_name: SYSTEM_DELETED_OPTION_VOTER,
        points: 0,
      });

      // 2. Also attempt physical deletion from `options` (cascades votes if DELETE RLS is active).
      await supabase.from("options").delete().eq("id", optionId);
    } catch (err) {
      console.warn("Supabase option delete fallback:", err);
    }
  }

  const store = readLocalStore();
  if (store.optionsByRoomId[roomId]) {
    store.optionsByRoomId[roomId] = store.optionsByRoomId[roomId].filter(
      (o) => o.id !== optionId
    );
  }
  if (store.votesByRoomId[roomId]) {
    store.votesByRoomId[roomId] = store.votesByRoomId[roomId].filter(
      (v) => v.option_id !== optionId
    );
  }
  writeLocalStore(store);
}

/**
 * Subscribes to realtime changes for a room (votes, options, winner decisions)
 * via Supabase Realtime + local BroadcastChannel.
 */
export function subscribeToRoomRealtime(
  roomId: string,
  onRoomChanged: () => void
): () => void {
  const cleanups: Array<() => void> = [];

  if (isSupabaseConfigured()) {
    const channel = supabase
      .channel(`room-live-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          onRoomChanged();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "options",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          onRoomChanged();
        }
      )
      .subscribe();

    cleanups.push(() => {
      supabase.removeChannel(channel);
    });
  }

  if (typeof window !== "undefined") {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      const handler = () => onRoomChanged();
      bc.addEventListener("message", handler);
      cleanups.push(() => {
        bc.removeEventListener("message", handler);
        bc.close();
      });
    }

    const storageHandler = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_ROOMS_KEY) {
        onRoomChanged();
      }
    };
    window.addEventListener("storage", storageHandler);
    cleanups.push(() => window.removeEventListener("storage", storageHandler));
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
