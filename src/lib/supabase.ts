import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Supabase now issues "publishable" keys (sb_publishable_...) in place of the
// legacy anon JWT. Accept either env var name. Each must be referenced literally
// so Next.js can inline it into the client bundle.
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

const supabaseUrl = readSupabaseUrl() || "https://placeholder-project.supabase.co";
const supabaseAnonKey = readSupabaseKey() || "placeholder-anon-key";

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export function isSupabaseConfigured(): boolean {
  const url = readSupabaseUrl();
  const key = readSupabaseKey();
  const isValidKey =
    key.startsWith("sb_publishable_") || // new publishable key format
    key.startsWith("eyJ"); // legacy anon JWT format
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
  mode: "supabase" | "local";
}

const LOCAL_STORAGE_ROOMS_KEY = "decide_for_us_local_rooms_v1";
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
      bc.postMessage({ type: "VOTES_UPDATED", timestamp: Date.now() });
      bc.close();
    }
  } catch {
    // Ignore storage quota errors
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
 * Generates a short random 6-character uppercase room code (excluding ambiguous characters)
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
 * Creates a room and its options in Supabase (with automatic local fallback if Supabase isn't connected yet)
 */
export async function createRoom(
  title: string,
  optionLabels: string[]
): Promise<{ code: string; room: Room; mode: "supabase" | "local" }> {
  const cleanTitle = title.trim();
  const cleanOptions = optionLabels.map((o) => o.trim()).filter(Boolean);
  const code = generateRoomCode();
  const now = new Date().toISOString();

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

      // Mirror to local store as cache
      const store = readLocalStore();
      store.rooms[code] = roomData as Room;
      store.optionsByRoomId[roomData.id] = (insertedOptions || []) as RoomOption[];
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

  // Fallback local persistence so app works out-of-the-box before .env.local is populated
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
 * Loads a room, its options, and all current votes by 6-character room code.
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
        const [{ data: optionsData, error: optionsError }, { data: votesData, error: votesError }] =
          await Promise.all([
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
          return {
            room: roomData as Room,
            options: (optionsData || []) as RoomOption[],
            votes: (votesData || []) as Vote[],
            mode: "supabase",
          };
        }
      }
    } catch (err) {
      console.warn("Supabase fetch error, checking local fallback:", err);
    }
  }

  // Check local fallback store
  const store = readLocalStore();
  const localRoom = store.rooms[code];
  if (!localRoom) {
    return null;
  }

  return {
    room: localRoom,
    options: store.optionsByRoomId[localRoom.id] || [],
    votes: store.votesByRoomId[localRoom.id] || [],
    mode: "local",
  };
}

/**
 * Fetches latest votes for a given room ID.
 */
export async function fetchVotesForRoom(
  roomId: string,
  mode: "supabase" | "local"
): Promise<Vote[]> {
  if (mode === "supabase" && isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from("votes")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      return data as Vote[];
    }
  }

  const store = readLocalStore();
  return store.votesByRoomId[roomId] || [];
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
      // Check if voter already voted on this option in this room so re-voting updates cleanly
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

  // Local store upsert
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
 * Subscribes to realtime vote changes for a room via Supabase Realtime + local BroadcastChannel.
 */
export function subscribeToRoomRealtime(
  roomId: string,
  onVotesChanged: () => void
): () => void {
  const cleanups: Array<() => void> = [];

  // 1. Supabase Realtime subscription on public.votes
  if (isSupabaseConfigured()) {
    const channel = supabase
      .channel(`room-votes-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          onVotesChanged();
        }
      )
      .subscribe();

    cleanups.push(() => {
      supabase.removeChannel(channel);
    });
  }

  // 2. Cross-tab BroadcastChannel & storage listener for instant local updates
  if (typeof window !== "undefined") {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      const handler = () => onVotesChanged();
      bc.addEventListener("message", handler);
      cleanups.push(() => {
        bc.removeEventListener("message", handler);
        bc.close();
      });
    }

    const storageHandler = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_ROOMS_KEY) {
        onVotesChanged();
      }
    };
    window.addEventListener("storage", storageHandler);
    cleanups.push(() => window.removeEventListener("storage", storageHandler));
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
