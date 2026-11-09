// Key-term decks for Economics topics. Add a deck file in src/data/decks/ and import it here; topic pages pick it up by slug.
const files = import.meta.glob('../data/decks/*.json', { eager: true });
export const decks: any[] = Object.values(files).map((m: any) => m.default ?? m).sort((a, b) => a.name.localeCompare(b.name));
export const deckFor = (slug: string) => decks.find((d) => d.topic === slug);
