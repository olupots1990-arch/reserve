
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

// --- START Menu & Order Types ---

export enum OrderStatus {
    PLACED = 'Order Placed',
    PREPARING = 'Preparing',
    OUT_FOR_DELIVERY = 'Out for Delivery',
    DELIVERED = 'Delivered',
}

export interface CustomizationOption {
    name: string;
    priceModifier?: number; // e.g., 1.5 for +$1.50
}

export interface CustomizationGroup {
    title: string;
    type: 'radio' | 'checkbox';
    options: CustomizationOption[];
}

export interface MenuItem {
  name: string;
  description: string;
  price: string;
  customizations?: CustomizationGroup[];
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export interface CartItem {
    item: MenuItem;
    selectedCustomizations: CustomizationOption[];
    finalPrice: number;
}

export interface ActiveOrder {
    id: string;
    items: CartItem[];
    total: number;
    status: OrderStatus;
}

// --- END Menu & Order Types ---


export interface Message {
  id: string;
  author: Author;
  type: 'text' | 'image' | 'video' | 'audio' | 'loading' | 'error' | 'veo_api_key' | 'reservation_confirmation' | 'menu' | 'customization_prompt' | 'order_summary' | 'order_status';
  content: string;
  prompt?: string;
  grounding?: GroundingChunk[];
  reservationDetails?: Partial<Reservation>;
  actions?: { text: string, payload: string }[];
  menuData?: MenuCategory[];
  // Order flow related properties
  customizationPrompt?: { item: MenuItem; };
  orderSummary?: { cart: CartItem[]; };
  orderStatusDetails?: { orders: ActiveOrder[] };
}