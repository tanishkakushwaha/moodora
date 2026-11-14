export const moods = [
    { id: 'happy', label: 'Happy', emoji: '😊', color: '#f6dc91', background: '#fff5d7', score: 4 },
    { id: 'calm', label: 'Calm', emoji: '😌', color: '#9fbea8', background: '#eaf2e9', score: 4 },
    { id: 'loved', label: 'Loved', emoji: '🥰', color: '#e6a1b3', background: '#fce8ed', score: 5 },
    { id: 'excited', label: 'Excited', emoji: '🤩', color: '#c4a2d8', background: '#f1eafa', score: 5 },
    { id: 'tired', label: 'Tired', emoji: '😴', color: '#acb5ca', background: '#edf0f7', score: 2 },
    { id: 'sad', label: 'Sad', emoji: '😔', color: '#95b9d8', background: '#e8f1fa', score: 1 },
    { id: 'anxious', label: 'Anxious', emoji: '😟', color: '#e8ba87', background: '#fbefdf', score: 2 },
    { id: 'angry', label: 'Angry', emoji: '😤', color: '#d89488', background: '#fbeae5', score: 1 },
] as const;
export type MoodId = typeof moods[number]['id'];
export const findMood = (id?: string | null) => moods.find(m => m.id === id);
export const quotes = [
    { id: 'q1', text: 'You are allowed to be both a masterpiece and a work in progress.', author: 'Sophia Bush', category: 'self-love' },
    { id: 'q2', text: 'Almost everything will work again if you unplug it for a few minutes, including you.', author: 'Anne Lamott', category: 'healing' },
    { id: 'q3', text: 'No act of kindness, no matter how small, is ever wasted.', author: 'Aesop', category: 'positivity' },
    { id: 'q4', text: 'Nothing can dim the light which shines from within.', author: 'Maya Angelou', category: 'confidence' },
    { id: 'q5', text: 'Happiness depends upon ourselves.', author: 'Aristotle', category: 'happiness' },
    { id: 'q6', text: 'You yourself, as much as anybody in the entire universe, deserve your love and affection.', author: 'Sharon Salzberg', category: 'self-love' },
    { id: 'q7', text: 'Healing has its own seasons. Give yourself the same patience you would offer a garden.', author: 'A little reminder from Moodora', category: 'healing' },
    { id: 'q8', text: 'With the new day comes new strength and new thoughts.', author: 'Eleanor Roosevelt', category: 'positivity' },
    { id: 'q9', text: 'Believe you can and you’re halfway there.', author: 'Theodore Roosevelt', category: 'confidence' },
    { id: 'q10', text: 'Wherever you are, be all there.', author: 'Jim Elliot', category: 'happiness' },
    { id: 'q11', text: 'You do not have to rush your becoming. Small steps are still steps.', author: 'A little reminder from Moodora', category: 'healing' },
    { id: 'q12', text: 'Make room for the things that make you feel like yourself.', author: 'A little reminder from Moodora', category: 'self-love' },
];
export function dailyQuote(date = new Date()) {
    const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
    return quotes[day % quotes.length];
}
