export type Gender = 'M' | 'F' | 'U';

export interface LifeEvent {
  id: string;
  year: number;
  type: 'birth' | 'marriage' | 'migration' | 'education' | 'career' | 'military' | 'residence' | 'death' | 'other';
  title: string;
  place?: string;
  toPlace?: string; // for migration
}

export interface MediaItem {
  id: string;
  kind: 'photo' | 'document' | 'story' | 'audio';
  title: string;
  year?: number;
  src?: string; // data URL for uploaded images
  note?: string; // free text, transcript, or a source URL
  audioKey?: string; // IndexedDB key of a recorded voice answer
  question?: string; // the interview question this story answers
  questionId?: string;
  recordedAt?: string; // ISO date
}

export interface Person {
  id: string;
  given: string;
  surname: string;
  birthSurname?: string;
  gender: Gender;
  birthDate?: string; // YYYY-MM-DD or YYYY
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  residence?: string; // where they live now (or last lived)
  fatherId?: string;
  motherId?: string;
  spouseIds: string[];
  occupation?: string;
  bio?: string;
  photo?: string;
  tags: string[];
  events: LifeEvent[];
  media: MediaItem[];
}

export type ViewId = 'today' | 'tree' | 'fan' | 'radial' | 'timeline' | 'map' | 'time' | 'stories' | 'insights';

export type ColorMode = 'branch' | 'surname' | 'generation' | 'gender' | 'lifespan' | 'country' | 'none';

export type Scope = 'all' | 'hourglass' | 'ancestors' | 'descendants' | 'direct';

export interface Filters {
  text: string;
  scope: Scope;
  genMin: number;
  genMax: number;
  yearMin: number;
  yearMax: number;
  status: 'all' | 'living' | 'deceased';
  gender: 'all' | 'M' | 'F';
  surnames: string[];
  countries: string[];
  branches: string[];
  tags: string[];
  aliveIn: number | null; // only people alive in this year
  mode: 'highlight' | 'hide';
}

/** A letter (and optional voice note) sealed until a future date. */
export interface Capsule {
  id: string;
  toId: string;
  fromId?: string;
  fromName: string;
  title: string;
  message: string;
  audioKey?: string;
  unlockDate: string; // YYYY-MM-DD
  unlockLabel: string; // e.g. "on Noah’s 18th birthday"
  createdAt: string; // ISO
  openedAt?: string;
}
