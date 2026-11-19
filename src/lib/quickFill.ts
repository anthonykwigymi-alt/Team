export type QuickFillCategoryId =
  | "auto"
  | "food"
  | "watch"
  | "play"
  | "hangout"
  | "wildcard";

export type ConcreteCategoryId = Exclude<QuickFillCategoryId, "auto">;

export interface CategoryMeta {
  id: QuickFillCategoryId;
  pillLabel: string;
  fullName: string;
  defaultTitle: string;
}

export const QUICK_FILL_CATEGORIES: CategoryMeta[] = [
  {
    id: "auto",
    pillLabel: "Auto-Detect",
    fullName: "Auto-Detect",
    defaultTitle: "What's the move tonight?",
  },
  {
    id: "food",
    pillLabel: "Food",
    fullName: "Food & Drinks",
    defaultTitle: "Where are we eating?",
  },
  {
    id: "watch",
    pillLabel: "Watch",
    fullName: "Movies & Watchlist",
    defaultTitle: "What are we watching?",
  },
  {
    id: "play",
    pillLabel: "Play",
    fullName: "Games",
    defaultTitle: "What game are we playing?",
  },
  {
    id: "hangout",
    pillLabel: "Hangout",
    fullName: "Hangouts & Activities",
    defaultTitle: "What are we doing together?",
  },
  {
    id: "wildcard",
    pillLabel: "Wildcard",
    fullName: "Wildcard",
    defaultTitle: "Pick our wildcard plan",
  },
];

/**
 * Rich option library with 32+ varied options per category across 5 categories.
 */
export const QUICK_FILL_LIBRARY: Record<ConcreteCategoryId, string[]> = {
  food: [
    "Street Tacos & Quesabirria",
    "Spicy Tonkotsu Ramen",
    "Wood-Fired Neapolitan Pizza",
    "Korean BBQ Grill",
    "Crispy Smash Burgers & Fries",
    "Conveyor Belt Sushi",
    "Authentic Pad Thai & Green Curry",
    "Nashville Hot Fried Chicken",
    "Vietnamese Pho & Spring Rolls",
    "Mediterranean Shawarma & Mezze",
    "Soup Dumplings & Dim Sum",
    "Indian Butter Chicken & Garlic Naan",
    "Texas Smoked Brisket BBQ",
    "Poké Bowls & Boba Tea",
    "Classic Steakhouse & Truffle Fries",
    "New York Style Bagels & Deli",
    "Szechuan Hot Pot",
    "Tapas & Sangria Bar",
    "Peruvian Rotisserie Chicken & Ceviche",
    "Ethiopian Injera Platter",
    "Cuban Sandwiches & Plantains",
    "Gourmet Mac & Cheese Bar",
    "Seafood Boil & Garlic Butter Crab",
    "French Bistro & Moules-Frites",
    "Falafel Wraps & Hummus Plate",
    "Craft Brewery & Gastropub Nachos",
    "Late-Night Waffle & Diner Breakfast",
    "Handmade Pasta & Tiramisu",
    "Korean Fried Chicken & Beer",
    "Lebanese Grill & Fattoush",
    "Cajun Jambalaya & Beignets",
    "Artisanal Wood-Oven Flatbreads",
    "Halal Cart Chicken Over Rice",
    "Oaxacan Mole & Mezcal",
  ],
  watch: [
    "Sci-Fi Mind-Bender Thriller",
    "A24 Indie Drama",
    "90s Cult Classic Action",
    "Stand-Up Comedy Special",
    "True Crime Documentary Mini-Series",
    "Studio Ghibli Animated Feature",
    "High-Stakes Heist Movie",
    "Cozy Murder Mystery Whodunit",
    "Psychological Horror",
    "Classic Sitcom Pilot Marathon",
    "Cyberpunk Anime Feature",
    "Survival Wilderness Thriller",
    "Academy Award Best Picture Winner",
    "Fast-Paced Courtroom Drama",
    "Post-Apocalyptic Road Movie",
    "Wes Anderson Quirky Comedy",
    "Historical Epic Blockbuster",
    "Sports Underdog Documentary",
    "Late-Night Monster Creature Feature",
    "90-Minute Tightly Paced Thriller",
    "Noir Detective Mystery",
    "Space Exploration Sci-Fi Epic",
    "Foreign-Language Festival Hit",
    "Dark Satire & Black Comedy",
    "Music Legend Biopic",
    "Time-Loop Paradox Comedy",
    "Spy Espionage Thriller",
    "Animated Superhero Multiverse",
    "Cooking Competition Finale",
    "Found-Footage Suspense",
    "Classic 80s Adventure Flick",
    "Action Choreography Showcase",
    "Surrealist Mystery Film",
    "Concert Film on Full Volume",
  ],
  play: [
    "Mario Kart 8 Tournament",
    "Jackbox Party Pack Trivia",
    "Overcooked 2 Couch Co-Op",
    "Super Smash Bros Ultimate",
    "Catan Board Game Night",
    "Codenames Team Showdown",
    "Among Us Social Deduction",
    "Rocket League 2v2",
    "Texas Hold'em Poker Night",
    "Baldur's Gate 3 Co-Op Campaign",
    "Helldivers 2 Squad Drop",
    "Street Fighter 6 Bracket",
    "Minecraft Survival Server",
    "UNO No Mercy House Rules",
    "Wavelength Mind-Reading Game",
    "Ticket to Ride Board Game",
    "Lethal Company Late-Night Run",
    "It Takes Two Split-Screen",
    "Chess Blitz 3-Minute Clock",
    "EA Sports FC / FIFA Tournament",
    "Exploding Kittens Card Game",
    "GeoGuessr World Streak Challenge",
    "Gang Beasts Couch Chaos",
    "Secret Hitler Hidden Roles",
    "cuphead Boss Rush Co-Op",
    "Monikers Charades Party Game",
    "Valheim Viking Base Building",
    "Tetris Effect Versus Mode",
    "Mario Party Superstars",
    "Sushi Go Party Card Draft",
    "Halo Master Chief Co-Op",
    "Dixit Storytelling Board Game",
    "Bananagrams Speed Round",
    "Keep Talking and Nobody Explodes",
  ],
  hangout: [
    "Sunset Rooftop Drinks",
    "Late-Night Bowling Alley",
    "Retro Arcade & Pinball Bar",
    "Escape Room Challenge",
    "Live Stand-Up Comedy Club",
    "Board Game Café Session",
    "Night Market & Street Food Walk",
    "Karaoke Private Room",
    "Mini Golf Under the Lights",
    "Bonfire & Stargazing",
    "Indoor Bouldering / Climbing Gym",
    "Trivia Night at a Local Pub",
    "Thrift Store $20 Outfit Challenge",
    "Golden Hour Scenic Hike",
    "Go-Kart Racing Track",
    "Pottery or Paint-and-Sip Studio",
    "Live Jazz or Indie Concert",
    "Picnic in the Park with Speakers",
    "Ice Skating or Roller Rink",
    "Bookstore Browse & Espresso Bar",
    "Billiards / Pool Hall Night",
    "Drive-In or Rooftop Cinema",
    "Axe Throwing Lanes",
    "Farmers Market & Pastry Crawl",
    "Kayaking or Paddleboarding",
    "Comedy Open Mic Night",
    "Museum After-Hours Evening",
    "Shuffleboard & Craft Cider Bar",
    "Bike Ride Along the Waterfront",
    "Dessert & Gelato Hopping",
    "Vinyl Record Shop & Listening Café",
    "Table Tennis / Ping Pong Lounge",
    "Botanical Garden Walk",
    "Neighborhood Taco & Mural Tour",
  ],
  wildcard: [
    "Flip a Coin at Every Intersection Walk",
    "Cook a 3-Course Mystery Basket Meal",
    "Zero-Phones Vinyl Listening Session",
    "Spontaneous 45-Minute Road Trip",
    "24-Hour Film Festival at Home",
    "Blind Taste-Test Supermarket Snacks",
    "Build the Ultimate Blanket Fort Cinema",
    "PowerPoint Night: 5-Minute Unhinged Talks",
    "Learn a Weird Card Trick Together",
    "Late-Night Airport Plane-Watching",
    "Host a Hot Ones Wing Gauntlet at Home",
    "Draft Fantasy Teams of Historical Figures",
    "Midnight Convenience Store Gourmet Challenge",
    "Rearrange the Living Room Feng Shui",
    "Write & Record a 10-Minute Podcast Episode",
    "Tier-List Everything We Did This Year",
    "Make Homemade Pizza Dough from Scratch",
    "Book the Cheapest Last-Minute Event Ticket",
    "DIY Mocktail & Cocktail Mixology Contest",
    "Solve a 500-Piece Puzzle Against a Timer",
    "Sunrise Breakfast at a 24-Hour Diner",
    "Take Disposables / Film Camera Night Walk",
    "Guilty-Pleasure 2000s Music Video Marathon",
    "Invent a New Board Game with House Objects",
    "folded-Paper Airplane Distance Championship",
    "Swap Playlists & Rate Every Track",
    "candlelit Murder Mystery Dinner at Home",
    "Silent Disco with Shared Bluetooth Playlist",
    "Paint Portraits of Each Other in 10 Minutes",
    "Time-Capsule Letter for Next Year",
    "Speed-Learn Basic Origami Challenges",
    "Neighborhood Coffee Shop Espresso Ranking",
  ],
};

const KEYWORD_MAP: Array<{
  category: ConcreteCategoryId;
  keywords: string[];
}> = [
  {
    category: "food",
    keywords: [
      "eat",
      "eating",
      "dinner",
      "lunch",
      "breakfast",
      "brunch",
      "food",
      "hungry",
      "restaurant",
      "takeout",
      "delivery",
      "drink",
      "drinks",
      "bar",
      "coffee",
      "cafe",
      "dessert",
      "snack",
      "bite",
      "feast",
      "order",
      "craving",
      "taco",
      "pizza",
      "ramen",
      "sushi",
      "burger",
    ],
  },
  {
    category: "watch",
    keywords: [
      "movie",
      "movies",
      "watch",
      "watching",
      "film",
      "films",
      "show",
      "shows",
      "series",
      "netflix",
      "tv",
      "cinema",
      "stream",
      "streaming",
      "anime",
      "documentary",
      "episode",
      "flick",
      "binge",
    ],
  },
  {
    category: "play",
    keywords: [
      "game",
      "games",
      "play",
      "playing",
      "gaming",
      "board",
      "card",
      "switch",
      "ps5",
      "xbox",
      "pc",
      "steam",
      "co-op",
      "coop",
      "multiplayer",
      "arcade",
      "trivia",
      "tournament",
    ],
  },
  {
    category: "hangout",
    keywords: [
      "hang",
      "hangout",
      "activity",
      "activities",
      "weekend",
      "tonight",
      "outing",
      "trip",
      "go",
      "going",
      "do",
      "doing",
      "date",
      "outside",
      "city",
      "adventure",
      "fun",
      "plan",
      "plans",
    ],
  },
];

/**
 * Inspects room title keywords when "Auto-Detect" is selected and returns the matching category.
 */
export function detectCategoryFromTitle(title: string): ConcreteCategoryId {
  const normalized = title.toLowerCase().trim();
  if (!normalized) {
    return "food";
  }

  const tokens = normalized.split(/[^a-z0-9-]+/).filter(Boolean);

  for (const entry of KEYWORD_MAP) {
    for (const kw of entry.keywords) {
      if (tokens.includes(kw) || normalized.includes(kw)) {
        return entry.category;
      }
    }
  }

  return "wildcard";
}

/**
 * True Fisher-Yates (Knuth) in-place shuffle on a cloned array.
 */
export function fisherYatesShuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Picks `count` (default 4) randomized options using a true Fisher-Yates shuffle,
 * excluding any options already present in `existingOptions` (case-insensitive)
 * so repeated clicks never produce duplicates.
 */
export function pickQuickFillOptions(params: {
  category: QuickFillCategoryId;
  roomTitle: string;
  existingOptions: string[];
  count?: number;
}): {
  resolvedCategory: ConcreteCategoryId;
  options: string[];
} {
  const { category, roomTitle, existingOptions, count = 4 } = params;

  const resolvedCategory: ConcreteCategoryId =
    category === "auto" ? detectCategoryFromTitle(roomTitle) : category;

  const excludedSet = new Set(
    existingOptions
      .map((opt) => opt.trim().toLowerCase())
      .filter((opt) => opt.length > 0)
  );

  const sourcePool = QUICK_FILL_LIBRARY[resolvedCategory];
  let available = sourcePool.filter(
    (candidate) => !excludedSet.has(candidate.trim().toLowerCase())
  );

  // If user has exhausted almost all 34 options in this category, top up from other categories
  // while still strictly excluding everything currently in the room.
  if (available.length < count) {
    const fallbackPool = Object.values(QUICK_FILL_LIBRARY)
      .flat()
      .filter((candidate) => !excludedSet.has(candidate.trim().toLowerCase()));
    available = Array.from(new Set([...available, ...fallbackPool]));
  }

  const shuffled = fisherYatesShuffle(available);
  return {
    resolvedCategory,
    options: shuffled.slice(0, count),
  };
}
