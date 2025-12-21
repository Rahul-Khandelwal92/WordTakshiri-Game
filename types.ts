
export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard'
}

export enum Category {
  Love = 'Love',
  Emotion = 'Emotion',
  Nature = 'Nature',
  Life = 'Life',
  Party = 'Party',
  Classic = 'Classic'
}

export interface SongHint {
  title: string;
  lyrics: string;
}

export interface BollywoodWord {
  id: string;
  word: string;
  englishMeaning: string;
  songs: SongHint[];
  difficulty: Difficulty;
  category: Category;
}

export type FilterState = {
  difficulty: Difficulty | 'All';
  category: Category | 'All';
  search: string;
};
