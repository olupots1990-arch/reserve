
export enum Author {
  USER = 'user',
  BOT = 'bot',
}

export enum BotMode {
  QUICK_RESPONSE = 'Fast AI responses',
  THINKING = 'Think more when needed',
  SEARCH_GROUNDING = 'Use Google Search data',
  MAPS_GROUNDING = 'Use Google Maps data',
  MAKE_RESERVATION = 'Make a reservation',
  TRANSCRIBE_AUDIO = 'Transcribe audio',
  SPEECH_GEN = 'Generate speech',
  IMAGE_GEN = 'Generate images with a prompt',
  IMAGE_EDIT = 'Nano banana powered app',
  IMAGE_ANALYSIS = 'Analyze images',
  VIDEO_UNDERSTANDING = 'Video understanding',
  VIDEO_GEN = 'Animate images with Veo',
  LIVE_CHAT = 'Create conversational voice apps',
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
        reviewSnippets: {
            uri: string;
            text: string;
        }[];
    }[]
  };
}

export interface Reservation {
    date: string;
    time: string;
    guests: number;
}


export interface Message {
  id: string;
  author: Author;
  type: 'text' | 'image' | 'video' | 'audio' | 'loading' | 'error' | 'veo_api_key' | 'reservation_confirmation';
  // FIX: The content of a message is always a string (URL or text). The File object is handled separately.
  content: string;
  prompt?: string;
  grounding?: GroundingChunk[];
  reservationDetails?: Partial<Reservation>;
  actions?: { text: string, payload: string }[];
}