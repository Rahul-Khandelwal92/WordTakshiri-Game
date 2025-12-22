
export enum Category {
  Love = 'Love',
  Emotion = 'Emotion',
  Nature = 'Nature',
  Life = 'Life',
  Party = 'Party',
  Classic = 'Classic',
  Patriotic = 'Patriotic'
}

export interface SongHint {
  title: string;
  lyrics: string;
}

export interface BollywoodWord {
  id: string;
  word: string;
  emoji: string;
  englishMeaning: string;
  songs: SongHint[];
  category: Category;
}

export type FilterState = {
  category: Category | 'All' | 'All Others';
  search: string;
  startingLetter: string | 'All';
};