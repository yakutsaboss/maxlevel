export const MOTIVATIONAL_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Stay focused and never give up.", author: "Unknown" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Little things make big days.", author: "Unknown" },
  { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
  { text: "Consistency is what transforms average into excellence.", author: "Unknown" },
  { text: "Your only limit is your mind.", author: "Unknown" },
  { text: "One day or day one. You decide.", author: "Unknown" },
  { text: "Be stronger than your excuses.", author: "Unknown" },
  { text: "Progress, not perfection.", author: "Unknown" },
];

/**
 * Returns a quote seeded by the current date, so the same quote shows all day.
 */
export function getDailyQuote(): typeof MOTIVATIONAL_QUOTES[number] {
  const now = new Date();
  const daysSinceEpoch = Math.floor(now.getTime() / (1000 * 60 * 60 * 24));
  return MOTIVATIONAL_QUOTES[daysSinceEpoch % MOTIVATIONAL_QUOTES.length];
}
