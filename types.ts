
export enum Author {
  USER = 'user',
  BOT = 'bot',
}

export enum BotMode {
  QUICK_RESPONSE = 'Fast AI responses',
  THINKING = 'Think more when needed',
  TRANSCRIBE_AUDIO = 'Transcribe audio',
  IMAGE_GEN = 'Generate images with a prompt',
  VIDEO_UNDERSTANDING = 'Video understanding',
  IMAGE_ANALYSIS = 'Analyze images',
  SPEECH_GEN = 'Generate speech',
  MAPS_GROUNDING = 'Use Google Maps data',
  SEARCH_GROUNDING = 'Use Google Search data',
  IMAGE_EDIT = 'Nano banana powered app',
  LIVE_CHAT = 'Create conversational voice apps',
  VIDEO_GEN = 'Animate images with Veo',
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


export interface Message {
  id: string;
  author: Author;
  type: 'text' | 'image' | 'video' | 'audio' | 'loading' | 'error' | 'veo_api_key';
  // FIX: The content of a message is always a string (URL or text). The File object is handled separately.
  content: string;
  prompt?: string;
  grounding?: GroundingChunk[];
}