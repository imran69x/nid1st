/**
 * Sticker & Emoji Packs for Bangladesh NID Scanner Messenger
 */

export interface StickerItem {
  id: string;
  name: string;
  category: "bengali" | "reactions" | "love";
  emoji: string;
  badgeText?: string;
  bgColor?: string;
  textColor?: string;
}

export const STICKER_PACKS: StickerItem[] = [
  // --- Bengali Expression Stickers ---
  {
    id: "salam",
    name: "সালাম",
    category: "bengali",
    emoji: "🌸",
    badgeText: "আসসালামু আলাইকুম",
    bgColor: "from-emerald-600 to-teal-700",
    textColor: "text-white",
  },
  {
    id: "dhonnobad",
    name: "ধন্যবাদ",
    category: "bengali",
    emoji: "🙏",
    badgeText: "অনেক ধন্যবাদ!",
    bgColor: "from-blue-600 to-indigo-700",
    textColor: "text-white",
  },
  {
    id: "valobasha",
    name: "ভালোবাসা",
    category: "love",
    emoji: "❤️",
    badgeText: "ভালোবাসা রইলো",
    bgColor: "from-rose-500 to-pink-600",
    textColor: "text-white",
  },
  {
    id: "kemon_achen",
    name: "কেমন আছেন",
    category: "bengali",
    emoji: "😊",
    badgeText: "কেমন আছেন?",
    bgColor: "from-amber-500 to-orange-600",
    textColor: "text-white",
  },
  {
    id: "thik_ache",
    name: "ঠিক আছে",
    category: "reactions",
    emoji: "👍",
    badgeText: "একদম ঠিক আছে!",
    bgColor: "from-emerald-500 to-green-600",
    textColor: "text-white",
  },
  {
    id: "mashaallah",
    name: "মাশাআল্লাহ",
    category: "bengali",
    emoji: "🌟",
    badgeText: "মাশাআল্লাহ",
    bgColor: "from-purple-600 to-indigo-700",
    textColor: "text-white",
  },
  {
    id: "inshaallah",
    name: "ইনশাআল্লাহ",
    category: "bengali",
    emoji: "🤲",
    badgeText: "ইনশাআল্লাহ",
    bgColor: "from-teal-600 to-emerald-700",
    textColor: "text-white",
  },
  {
    id: "shuvo_sokal",
    name: "শুভ সকাল",
    category: "bengali",
    emoji: "☀️",
    badgeText: "শুভ সকাল!",
    bgColor: "from-yellow-500 to-amber-600",
    textColor: "text-white",
  },
  {
    id: "shuvo_ratri",
    name: "শুভ রাত্রি",
    category: "bengali",
    emoji: "🌙",
    badgeText: "শুভ রাত্রি 💤",
    bgColor: "from-slate-800 to-indigo-950",
    textColor: "text-white",
  },
  {
    id: "obhinondon",
    name: "অভিনন্দন",
    category: "reactions",
    emoji: "🎉",
    badgeText: "অনেক অভিনন্দন!",
    bgColor: "from-violet-600 to-fuchsia-600",
    textColor: "text-white",
  },

  // --- Big Expressive Stickers ---
  {
    id: "thumbs_up",
    name: "লাইক",
    category: "reactions",
    emoji: "👍",
    badgeText: "SUPER LIKE",
    bgColor: "from-blue-500 to-blue-700",
    textColor: "text-white",
  },
  {
    id: "big_heart",
    name: "হৃদয়",
    category: "love",
    emoji: "💖",
    badgeText: "BIG LOVE",
    bgColor: "from-red-500 to-rose-600",
    textColor: "text-white",
  },
  {
    id: "fire",
    name: "জোশ",
    category: "reactions",
    emoji: "🔥",
    badgeText: "অসাধারণ জোশ!",
    bgColor: "from-orange-500 to-red-600",
    textColor: "text-white",
  },
  {
    id: "cha_adda",
    name: "চা আড্ডা",
    category: "bengali",
    emoji: "☕",
    badgeText: "এক কাপ চা হয়ে যাক!",
    bgColor: "from-amber-700 to-yellow-800",
    textColor: "text-white",
  },
  {
    id: "handshake",
    name: "ডিল",
    category: "reactions",
    emoji: "🤝",
    badgeText: "ডিল পাকা!",
    bgColor: "from-cyan-600 to-blue-700",
    textColor: "text-white",
  },
  {
    id: "hundred",
    name: "১০০%",
    category: "reactions",
    emoji: "💯",
    badgeText: "১০০% খাঁটি",
    bgColor: "from-red-600 to-rose-700",
    textColor: "text-white",
  },
];

// Quick Emoji Palette
export const QUICK_EMOJIS = [
  "😀", "😂", "🤣", "😍", "🥰", "😘", "😎", "🤩", "🥳", "😇",
  "👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "✌️", "👌", "🔥",
  "❤️", "💖", "💕", "💯", "🎉", "✨", "☕", "🌹", "💐", "🎂",
  "😭", "🥺", "😡", "🤔", "🤫", "😴", "👋", "👀", "⭐", "🌙"
];
