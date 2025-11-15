
import React, { useState, useRef, useEffect, useCallback } from 'react';
// FIX: Alias 'Blob' from '@google/genai' to 'GenaiBlob' to resolve the name conflict with the browser's native 'Blob' type.
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob } from '@google/genai';
import { Author, BotMode, Message, GroundingChunk, Reservation, MenuCategory, MenuItem, CartItem, CustomizationOption, ActiveOrder, OrderStatus } from './types';
import * as geminiService from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';

// --- START of Icon Components ---
const BotIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 12.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zm-7 0c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM12 18.5c-2.42 0-4.5-1.7-5.18-4h10.36c-.68 2.3-2.76 4-5.18 4z" /></svg>
);
const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
);
const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
);
const PaperclipIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" /></svg>
);
const MicIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" /></svg>
);
const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
);
// --- END of Icon Components ---

// --- START of Static Data ---
const MENU_DATA: MenuCategory[] = [
    {
        category: 'Appetizers',
        items: [
            { name: 'Gemini Bruschetta', description: 'Toasted baguette with tomato, basil, and a hint of garlic.', price: '$12' },
            { name: 'Flash-Fried Calamari', description: 'Lightly breaded and served with a spicy marinara.', price: '$15' },
        ],
    },
    {
        category: 'Main Courses',
        items: [
            { 
                name: 'The Gemini Pro Burger', 
                description: 'A juicy beef patty with our secret AI-oli.', 
                price: '$22',
                customizations: [
                    { title: 'Cheese', type: 'radio', options: [{ name: 'Cheddar' }, { name: 'Swiss' }, { name: 'No Cheese' }] },
                    { title: 'Toppings', type: 'checkbox', options: [{ name: 'Bacon', priceModifier: 2 }, { name: 'Avocado', priceModifier: 1.5 }, { name: 'Lettuce' }, { name: 'Tomato' }, { name: 'Onions' }] }
                ]
            },
            { 
                name: 'Veo-gan Pasta Primavera', 
                description: 'Fresh vegetables and pasta in a light sauce.', 
                price: '$20',
                customizations: [
                    { title: 'Spice Level', type: 'radio', options: [{ name: 'Mild' }, { name: 'Medium' }, { name: 'Spicy' }] },
                    { title: 'Add Protein', type: 'radio', options: [{ name: 'Tofu', priceModifier: 4 }, { name: 'No Protein' }] }
                ]
            },
            { name: 'Filet Mignon "Imagen"', description: 'A perfectly cooked 8oz filet, a true masterpiece.', price: '$45' },
        ],
    },
    {
        category: 'Desserts',
        items: [
            { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a gooey center.', price: '$10' },
        ],
    },
];
const FEATURED_ITEMS = [
    MENU_DATA[1].items[0], // Gemini Pro Burger
    MENU_DATA[1].items[1], // Veo-gan Pasta
    MENU_DATA[0].items[1], // Calamari
];
// --- END of Static Data ---

// --- START of Audio Utils for Live Chat ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
// --- END of Audio Utils for Live Chat ---

// --- START of Child Components ---
const MessageBubble: React.FC<{ message: Message; onActionClick?: (payload: string, data?: any) => void; }> = ({ message, onActionClick }) => {
    const isUser = message.author === Author.USER;
    const bubbleClasses = isUser
        ? 'bg-emerald-200 self-end'
        : 'bg-white self-start';
    
    const renderContent = () => {
        switch (message.type) {
            case 'text':
                return <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>;
            case 'image':
                 return (
                    <div>
                        {message.prompt && <p className="text-xs text-gray-600 mb-2 italic">"{message.prompt}"</p>}
                        <img src={message.content} alt="Generated content" className="rounded-lg max-w-xs" />
                    </div>
                );
            case 'video':
                return (
                    <div>
                        {message.prompt && <p className="text-xs text-gray-600 mb-2 italic">"{message.prompt}"</p>}
                        <video controls src={message.content} className="rounded-lg max-w-xs" />
                    </div>
                );
            case 'audio':
                return <audio controls src={message.content} className="w-full" />;
            case 'loading':
                return (
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-pulse"></div>
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2.5 h-2.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                );
             case 'veo_api_key':
                return (
                    <div>
                        <p className="text-sm text-gray-800 mb-2">{message.content}</p>
                        <button 
                            onClick={() => (window as any).aistudio?.openSelectKey()}
                            className="bg-blue-500 text-white text-sm font-semibold py-1 px-3 rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Select API Key
                        </button>
                         <p className="text-xs text-gray-500 mt-2">
                           For more info, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">billing documentation</a>.
                         </p>
                    </div>
                );
            case 'reservation_confirmation':
                const { date, time, guests } = message.reservationDetails || {};
                return (
                    <div>
                        <p className="text-sm text-gray-800 mb-2">{message.content}</p>
                        <div className="text-sm bg-gray-100 p-2 rounded-md border border-gray-200 space-y-1">
                            {date && <p><strong>Date:</strong> {date}</p>}
                            {time && <p><strong>Time:</strong> {time}</p>}
                            {guests && <p><strong>Guests:</strong> {guests}</p>}
                        </div>
                        {message.actions && (
                            <div className="flex gap-2 mt-3">
                                {message.actions.map(action => (
                                    <button
                                        key={action.payload}
                                        onClick={() => onActionClick?.(action.payload)}
                                        className={`${action.payload === 'CANCEL_RESERVATION' ? 'bg-gray-300 text-gray-800 hover:bg-gray-400' : 'bg-emerald-500 text-white hover:bg-emerald-600'} text-xs font-semibold py-1 px-3 rounded-lg transition-colors`}
                                    >
                                        {action.text}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'menu':
                return (
                    <div>
                        <p className="text-sm text-gray-800 mb-3">{message.content}</p>
                        <div className="space-y-4">
                            {message.menuData?.map((category, index) => (
                                <div key={index}>
                                    <h4 className="text-md font-bold text-emerald-700 border-b-2 border-emerald-200 pb-1 mb-2">{category.category}</h4>
                                    <ul className="space-y-2">
                                        {category.items.map((item, itemIndex) => (
                                            <li key={itemIndex} className="text-sm">
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-gray-800">{item.name}</span>
                                                    <span className="font-bold text-gray-900">{item.price}</span>
                                                </div>
                                                <p className="text-xs text-gray-600 italic pl-1">{item.description}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'customization_prompt':
                const { item } = message.customizationPrompt!;
                return (
                    <div>
                        <p className="text-sm text-gray-800 mb-2">How would you like your <strong>{item.name}</strong>?</p>
                        {item.customizations?.map((group, index) => (
                            <div key={index} className="my-2 p-2 bg-gray-50 rounded-md">
                                <h5 className="text-xs font-bold mb-1">{group.title}</h5>
                                <div className="flex flex-wrap gap-2">
                                    {group.options.map(opt => (
                                        <button 
                                            key={opt.name}
                                            onClick={() => onActionClick?.('SELECT_CUSTOMIZATION', { group, option: opt })}
                                            className="bg-gray-200 text-xs text-gray-800 py-1 px-2 rounded-full hover:bg-emerald-200"
                                        >
                                            {opt.name} {opt.priceModifier ? `(+$${opt.priceModifier.toFixed(2)})` : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button onClick={() => onActionClick?.('CONFIRM_CUSTOMIZATIONS')} className="w-full mt-3 bg-emerald-500 text-white text-xs font-semibold py-1 px-3 rounded-lg hover:bg-emerald-600">Add to Order</button>
                        <button onClick={() => onActionClick?.('CANCEL_ORDER_ITEM')} className="w-full mt-1 bg-gray-300 text-gray-800 text-xs font-semibold py-1 px-3 rounded-lg hover:bg-gray-400">Cancel</button>
                    </div>
                );
            case 'order_summary':
                const { cart } = message.orderSummary!;
                const total = cart.reduce((sum, cartItem) => sum + cartItem.finalPrice, 0);
                return (
                    <div>
                        <p className="text-sm text-gray-800 mb-2"><strong>Your Current Order:</strong></p>
                        <ul className="space-y-2 text-sm bg-gray-50 p-2 rounded-md">
                            {cart.map((cartItem, index) => (
                                <li key={index}>
                                    <div className="flex justify-between font-semibold">
                                        <span>{cartItem.item.name}</span>
                                        <span>${cartItem.finalPrice.toFixed(2)}</span>
                                    </div>
                                    <ul className="list-disc list-inside text-xs text-gray-600 pl-2">
                                        {cartItem.selectedCustomizations.map(opt => <li key={opt.name}>{opt.name}</li>)}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                        <div className="flex justify-between font-bold text-md mt-2 pt-2 border-t">
                            <span>Total:</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                        <div className="flex gap-2 mt-3">
                           <button onClick={() => onActionClick?.('PLACE_ORDER')} className="flex-1 bg-emerald-500 text-white text-xs font-semibold py-1 px-3 rounded-lg hover:bg-emerald-600">Place Order</button>
                           <button onClick={() => onActionClick?.('CLEAR_CART')} className="flex-1 bg-gray-300 text-gray-800 text-xs font-semibold py-1 px-3 rounded-lg hover:bg-gray-400">Clear Cart</button>
                        </div>
                    </div>
                );
            case 'order_status':
                 const { orders } = message.orderStatusDetails!;
                 const statusOrder = Object.values(OrderStatus);
                 return (
                     <div>
                         <p className="text-sm text-gray-800 mb-2">{message.content}</p>
                         {orders.map(order => (
                           <div key={order.id} className="p-2 my-2 border rounded-lg bg-gray-50">
                               <p className="text-sm font-bold">Order ID: {order.id}</p>
                               <div className="flex items-center justify-between mt-2 text-xs">
                                   {statusOrder.map((status, i) => {
                                       const isActive = order.status === status;
                                       const isCompleted = statusOrder.indexOf(order.status) > i;
                                       return (
                                          <React.Fragment key={status}>
                                            <div className="flex flex-col items-center">
                                                <div className={`w-4 h-4 rounded-full ${isActive ? 'bg-emerald-500 ring-2 ring-emerald-300' : isCompleted ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                                                <p className={`mt-1 ${isActive ? 'font-bold text-emerald-600' : ''}`}>{status}</p>
                                            </div>
                                            {i < statusOrder.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>}
                                          </React.Fragment>
                                       )
                                   })}
                               </div>
                           </div>
                         ))}
                     </div>
                 );
            case 'error':
                 return <p className="text-sm text-red-600">{message.content}</p>;
            default:
                return null;
        }
    };
    
    const renderGrounding = () => {
        if (!message.grounding || message.grounding.length === 0) return null;
        
        return (
            <div className="mt-2 pt-2 border-t border-gray-300">
                <h4 className="text-xs font-bold text-gray-600 mb-1">Sources:</h4>
                <ul className="list-disc list-inside text-xs">
                    {message.grounding.map((chunk, index) => {
                         if (chunk.web) {
                            return <li key={index}><a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{chunk.web.title}</a></li>
                         }
                         if (chunk.maps) {
                            return <li key={index}><a href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{chunk.maps.title}</a></li>
                         }
                         return null;
                    })}
                </ul>
            </div>
        )
    };

    return (
        <div className={`flex items-end gap-2 my-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && <BotIcon className="w-6 h-6 text-gray-500 mb-1" />}
            <div className={`rounded-lg p-3 max-w-md ${bubbleClasses}`}>
                {renderContent()}
                {renderGrounding()}
            </div>
             {isUser && <UserIcon className="w-6 h-6 text-gray-500 mb-1" />}
        </div>
    );
};

const HomePage: React.FC<{ onStartOrdering: () => void }> = ({ onStartOrdering }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % FEATURED_ITEMS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative h-full w-full overflow-hidden">
            <video autoPlay loop muted className="absolute z-0 w-auto min-w-full min-h-full max-w-none">
                <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center p-4">
                 <div className="w-full max-w-2xl h-64 md:h-80 relative overflow-hidden rounded-lg shadow-2xl">
                    {FEATURED_ITEMS.map((item, index) => (
                        <div
                            key={item.name}
                            className={`absolute inset-0 transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <img src={`https://picsum.photos/seed/${item.name.replace(/\s/g, '')}/800/600`} alt={item.name} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-4">
                                <h3 className="text-xl font-bold">{item.name}</h3>
                                <p className="text-sm">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold mt-6">Welcome to The Gemini Bistro</h1>
                <p className="mt-2 max-w-xl">Your AI-powered culinary experience starts here. Chat with our bot to book a table, explore our menu, or place an order.</p>
                <button onClick={onStartOrdering} className="mt-8 bg-emerald-500 text-white font-bold py-3 px-8 rounded-full hover:bg-emerald-600 transition-transform hover:scale-105">
                    Chat with BistroBot
                </button>
            </div>
        </div>
    )
}

const AdminPage: React.FC<{ reservations: Reservation[], orders: ActiveOrder[] }> = ({ reservations, orders }) => {
    return (
        <div className="p-4 md:p-6 bg-gray-50 min-h-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Admin Dashboard</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Confirmed Reservations ({reservations.length})</h3>
                    <div className="max-h-96 overflow-y-auto">
                        {reservations.length > 0 ? (
                           <ul className="divide-y divide-gray-200">
                                {reservations.map((res, i) => (
                                    <li key={i} className="py-2 text-sm">
                                        <strong>Date:</strong> {res.date}, <strong>Time:</strong> {res.time}, <strong>Guests:</strong> {res.guests}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500">No reservations confirmed yet.</p>}
                    </div>
                </div>
                 <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-lg font-semibold mb-2">Active Orders ({orders.length})</h3>
                     <div className="max-h-96 overflow-y-auto">
                        {orders.length > 0 ? (
                           <ul className="divide-y divide-gray-200">
                                {orders.map(order => (
                                    <li key={order.id} className="py-2 text-sm space-y-1">
                                       <div className="flex justify-between">
                                          <strong className="font-bold">ID: {order.id}</strong>
                                          <span className="font-semibold px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800">{order.status}</span>
                                       </div>
                                       <div><strong>Total:</strong> ${order.total.toFixed(2)}</div>
                                       <div><strong>Items:</strong> {order.items.map(i => i.item.name).join(', ')}</div>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-gray-500">No active orders.</p>}
                    </div>
                </div>
            </div>
        </div>
    )
}
// --- END of Child Components ---

const ChatPage: React.FC<{ reservations: Reservation[], setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>, activeOrders: ActiveOrder[], setActiveOrders: React.Dispatch<React.SetStateAction<ActiveOrder[]>> }> = ({ reservations, setReservations, activeOrders, setActiveOrders }) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 'welcome', author: Author.BOT, type: 'text', content: "Welcome to The Gemini Bistro! I'm BistroBot. How can I help you today? You can ask for my menu, make a reservation, or try one of my special features from the paperclip menu." },
    ]);
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<BotMode>(BotMode.QUICK_RESPONSE);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isLiveChat, setIsLiveChat] = useState(false);
    
    // Reservation State
    const [reservationFlowState, setReservationFlowState] = useState<'idle' | 'collecting_date' | 'collecting_time' | 'collecting_guests' | 'confirming'>('idle');
    const [pendingReservation, setPendingReservation] = useState<Partial<Reservation>>({});

    // Order State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderFlowState, setOrderFlowState] = useState<'idle' | 'customizing'>('idle');
    const [currentItemForOrder, setCurrentItemForOrder] = useState<{ item: MenuItem, selectedCustomizations: CustomizationOption[] } | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const liveSessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const [fileForProcessing, setFileForProcessing] = useState<File | null>(null);
    const [promptForFile, setPromptForFile] = useState<string>('');
    const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const addMessage = (message: Omit<Message, 'id'>) => {
        setMessages(prev => [...prev, { ...message, id: Date.now().toString() + Math.random() }]);
    };
    
    const updateLastMessage = (update: Partial<Message>) => {
        setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && (lastMessage.type === 'loading' || lastMessage.type === 'text' || lastMessage.type === 'menu' || lastMessage.type === 'customization_prompt')) {
                return [...prev.slice(0, -1), { ...lastMessage, ...update, id: lastMessage.id }];
            }
            return [...prev, { ...update, id: Date.now().toString(), author: Author.BOT } as Message];
        });
    };
    
    const handleGeolocation = (callback: (lat: number, lon: number) => void) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    callback(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    addMessage({ author: Author.BOT, type: 'error', content: 'Could not get your location. Please enable location services.' });
                }
            );
        } else {
             addMessage({ author: Author.BOT, type: 'error', content: 'Geolocation is not supported by your browser.' });
        }
    };
    
    const resetReservationFlow = () => {
        setReservationFlowState('idle');
        setPendingReservation({});
        setMode(BotMode.QUICK_RESPONSE);
    };
    
    const askForMissingInfo = useCallback((currentDetails: Partial<Reservation>) => {
        if (!currentDetails.date) {
            setReservationFlowState('collecting_date');
            addMessage({ author: Author.BOT, type: 'text', content: "What date would you like to book for?" });
        } else if (!currentDetails.time) {
            setReservationFlowState('collecting_time');
            addMessage({ author: Author.BOT, type: 'text', content: "And what time?" });
        } else if (!currentDetails.guests) {
            setReservationFlowState('collecting_guests');
            addMessage({ author: Author.BOT, type: 'text', content: "How many guests will be joining?" });
        } else {
            setReservationFlowState('confirming');
            addMessage({
                author: Author.BOT,
                type: 'reservation_confirmation',
                content: "Please confirm your reservation details:",
                reservationDetails: currentDetails,
                actions: [
                    { text: 'Confirm', payload: 'CONFIRM_RESERVATION' },
                    { text: 'Cancel', payload: 'CANCEL_RESERVATION' }
                ]
            });
        }
    }, []);

    const handleReservationLogic = useCallback(async (text: string) => {
        if (reservationFlowState !== 'idle' && !['CONFIRM_RESERVATION', 'CANCEL_RESERVATION'].includes(text)) {
            addMessage({ author: Author.USER, type: 'text', content: text });
        }

        let currentDetails = { ...pendingReservation };

        switch(reservationFlowState) {
            case 'idle':
                addMessage({ author: Author.USER, type: 'text', content: text });
                addMessage({ author: Author.BOT, type: 'loading', content: '' });
                try {
                    const extractedDetails = await geminiService.extractReservationDetails(text);
                    updateLastMessage({ type: 'text', content: "Let me check that for you..." });
                    currentDetails = {
                        date: extractedDetails.date || undefined,
                        time: extractedDetails.time || undefined,
                        guests: extractedDetails.guests || undefined
                    };
                    setPendingReservation(currentDetails);
                    askForMissingInfo(currentDetails);
                } catch (error) {
                     console.error(error);
                     updateLastMessage({ type: 'error', content: `Sorry, I had trouble understanding that. Could you please tell me the date for the reservation?` });
                     setReservationFlowState('collecting_date');
                }
                break;
            case 'collecting_date': currentDetails.date = text; setPendingReservation(currentDetails); askForMissingInfo(currentDetails); break;
            case 'collecting_time': currentDetails.time = text; setPendingReservation(currentDetails); askForMissingInfo(currentDetails); break;
            case 'collecting_guests':
                const guests = parseInt(text, 10);
                if (!isNaN(guests) && guests > 0) { currentDetails.guests = guests; setPendingReservation(currentDetails); askForMissingInfo(currentDetails); } 
                else { addMessage({ author: Author.BOT, type: 'text', content: "Please enter a valid number for guests." }); }
                break;
            case 'confirming':
                if (text === 'CONFIRM_RESERVATION') {
                    const finalReservation = pendingReservation as Reservation;
                    setReservations(prev => [...prev, finalReservation]);
                    addMessage({ author: Author.BOT, type: 'text', content: `Excellent! Your table for ${finalReservation.guests} is booked for ${finalReservation.date} at ${finalReservation.time}. We look forward to seeing you!` });
                    resetReservationFlow();
                } else if (text === 'CANCEL_RESERVATION') {
                    addMessage({ author: Author.BOT, type: 'text', content: "No problem, I've cancelled the reservation process." });
                    resetReservationFlow();
                }
                break;
        }
    }, [reservationFlowState, pendingReservation, askForMissingInfo, setReservations]);

    // --- START Order Logic ---
    const resetOrderFlow = () => {
        setOrderFlowState('idle');
        setCurrentItemForOrder(null);
    };

    const updateOrderStatus = useCallback((orderId: string, status: OrderStatus) => {
        setActiveOrders(prevOrders => {
            const updatedOrders = prevOrders.map(o => o.id === orderId ? { ...o, status } : o);
            const order = updatedOrders.find(o => o.id === orderId);
            if (order) {
                 addMessage({ 
                    author: Author.BOT, 
                    type: 'order_status', 
                    content: `Update for order #${order.id}:`,
                    orderStatusDetails: { orders: [order] }
                });
            }
            return updatedOrders;
        });
    }, [setActiveOrders]);

    const simulateOrderStatus = useCallback((orderId: string) => {
        setTimeout(() => updateOrderStatus(orderId, OrderStatus.PREPARING), 15000);
        setTimeout(() => updateOrderStatus(orderId, OrderStatus.OUT_FOR_DELIVERY), 35000);
        setTimeout(() => updateOrderStatus(orderId, OrderStatus.DELIVERED), 55000);
    }, [updateOrderStatus]);

    const handleOrderLogic = (action: string, data?: any) => {
        switch(action) {
            case 'SELECT_CUSTOMIZATION':
                 if (currentItemForOrder) {
                    const { group, option } = data;
                    let newSelections = [...currentItemForOrder.selectedCustomizations];
                    if (group.type === 'radio') {
                        // Remove other options from the same radio group
                        newSelections = newSelections.filter(sel => !group.options.some((o: CustomizationOption) => o.name === sel.name));
                    }
                    // Add or remove checkbox option
                    const existingIndex = newSelections.findIndex(sel => sel.name === option.name);
                    if (group.type === 'checkbox' && existingIndex > -1) {
                         newSelections.splice(existingIndex, 1);
                    } else {
                         newSelections.push(option);
                    }
                    setCurrentItemForOrder({ ...currentItemForOrder, selectedCustomizations: newSelections });
                 }
                break;
            case 'CONFIRM_CUSTOMIZATIONS':
                if (currentItemForOrder) {
                    const basePrice = parseFloat(currentItemForOrder.item.price.replace('$', ''));
                    const customizationsPrice = currentItemForOrder.selectedCustomizations.reduce((sum, opt) => sum + (opt.priceModifier || 0), 0);
                    const finalPrice = basePrice + customizationsPrice;
                    setCart(prev => [...prev, { item: currentItemForOrder.item, selectedCustomizations: currentItemForOrder.selectedCustomizations, finalPrice }]);
                    addMessage({ author: Author.BOT, type: 'text', content: `Added ${currentItemForOrder.item.name} to your order.` });
                    resetOrderFlow();
                }
                break;
            case 'CANCEL_ORDER_ITEM':
                addMessage({ author: Author.BOT, type: 'text', content: 'Cancelled adding item.' });
                resetOrderFlow();
                break;
             case 'CLEAR_CART':
                setCart([]);
                addMessage({ author: Author.BOT, type: 'text', content: 'Your cart has been cleared.' });
                break;
             case 'PLACE_ORDER':
                if (cart.length > 0) {
                    const total = cart.reduce((sum, cartItem) => sum + cartItem.finalPrice, 0);
                    const orderId = `BISTRO-${Date.now().toString().slice(-4)}`;
                    const newOrder: ActiveOrder = { id: orderId, items: cart, total, status: OrderStatus.PLACED };
                    setActiveOrders(prev => [...prev, newOrder]);
                    setCart([]);
                    addMessage({ 
                        author: Author.BOT, 
                        type: 'order_status', 
                        content: `Your order has been placed! We'll keep you updated.`,
                        orderStatusDetails: { orders: [newOrder] }
                    });
                    simulateOrderStatus(orderId);
                }
                break;
        }
    };
    
    // --- END Order Logic ---

    const processUserRequest = useCallback(async (text: string, file?: File) => {
        addMessage({ author: Author.USER, type: 'text', content: text, prompt: file ? text : undefined });
        addMessage({ author: Author.BOT, type: 'loading', content: '' });

        try {
            let response;
            switch(mode) {
                case BotMode.THINKING: response = await geminiService.generateThinkingResponse(text); updateLastMessage({ type: 'text', content: response.text }); break;
                case BotMode.SEARCH_GROUNDING: response = await geminiService.searchWithGoogle(text); updateLastMessage({ type: 'text', content: response.text, grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks }); break;
                case BotMode.MAPS_GROUNDING: handleGeolocation(async (lat, lon) => { response = await geminiService.searchWithMaps(text, lat, lon); updateLastMessage({ type: 'text', content: response.text, grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks }); }); break;
                case BotMode.IMAGE_ANALYSIS: if (!file) throw new Error("Please upload an image for analysis."); response = await geminiService.analyzeImage(file, text); updateLastMessage({ type: 'text', content: response.text }); break;
                case BotMode.VIDEO_UNDERSTANDING: if (!file) throw new Error("Please upload a video for analysis."); response = await geminiService.analyzeVideo(file, text); updateLastMessage({ type: 'text', content: response.text }); break;
                case BotMode.IMAGE_EDIT: if (!file) throw new Error("Please upload an image to edit."); const editedImageBase64 = await geminiService.editImage(file, text); updateLastMessage({ type: 'image', content: `data:image/png;base64,${editedImageBase64}`, prompt: text }); break;
                case BotMode.IMAGE_GEN: const imageBase64 = await geminiService.generateImage(text, aspectRatio); updateLastMessage({ type: 'image', content: `data:image/jpeg;base64,${imageBase64}`, prompt: text }); break;
                case BotMode.SPEECH_GEN: const speechBase64 = await geminiService.generateSpeech(text); updateLastMessage({ type: 'audio', content: `data:audio/wav;base64,${speechBase64}` }); break;
                case BotMode.TRANSCRIBE_AUDIO: if (!file) throw new Error("No audio file provided for transcription."); response = await geminiService.transcribeAudio(file); addMessage({ author: Author.BOT, type: 'text', content: `Transcription: "${response.text}"` }); setMessages(prev => prev.filter(m => m.type !== 'loading')); break;
                case BotMode.VIDEO_GEN:
                    if (!file) throw new Error("Please upload an image to animate.");
                    const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
                    if (!hasKey) { updateLastMessage({ type: 'veo_api_key', content: "To generate a video with Veo, you need to select a personal API key." }); return; }
                    try {
                        const videoUrl = await geminiService.generateVideoFromImage(file, text, aspectRatio === '9:16' ? '9:16' : '16:9');
                        updateLastMessage({ type: 'video', content: videoUrl, prompt: text });
                    } catch (e: any) {
                         if (e.message?.includes("Requested entity was not found")) { updateLastMessage({ type: 'veo_api_key', content: "Your API key seems invalid. Please select a valid key." }); } 
                         else { throw e; }
                    }
                    break;
                case BotMode.QUICK_RESPONSE:
                default:
                    // --- START Quick Response Keywords ---
                    if (/(menu|what do you serve)/i.test(text)) { updateLastMessage({ type: 'menu', content: "Of course! Here is our menu.", menuData: MENU_DATA }); return; }
                    if (/(reservation|book a table)/i.test(text)) { setMode(BotMode.MAKE_RESERVATION); handleReservationLogic(text); return; }
                    if (/(view order|my cart|see my order)/i.test(text)) {
                         if (cart.length > 0) { updateLastMessage({ type: 'order_summary', content: '', orderSummary: { cart } }); }
                         else { updateLastMessage({ type: 'text', content: "Your cart is currently empty. Ask for the menu to start an order!" }); }
                         return;
                    }
                    if (/(order status|track my order)/i.test(text)) {
                         if (activeOrders.length > 0) { updateLastMessage({ type: 'order_status', content: 'Here is the status of your active order(s):', orderStatusDetails: { orders: activeOrders } }); }
                         else { updateLastMessage({ type: 'text', content: "You don't have any active orders." }); }
                         return;
                    }
                    const allItems = MENU_DATA.flatMap(c => c.items);
                    const orderedItem = allItems.find(item => new RegExp(item.name, 'i').test(text));
                    if (orderedItem) {
                        if (orderedItem.customizations) {
                            setOrderFlowState('customizing');
                            setCurrentItemForOrder({ item: orderedItem, selectedCustomizations: [] });
                            updateLastMessage({ type: 'customization_prompt', content: '', customizationPrompt: { item: orderedItem }});
                        } else {
                            const basePrice = parseFloat(orderedItem.price.replace('$', ''));
                            setCart(prev => [...prev, { item: orderedItem, selectedCustomizations: [], finalPrice: basePrice }]);
                            updateLastMessage({ author: Author.BOT, type: 'text', content: `Added ${orderedItem.name} to your order.` });
                        }
                        return;
                    }
                    // --- END Quick Response Keywords ---
                    response = await geminiService.generateQuickResponse(text);
                    updateLastMessage({ type: 'text', content: response.text });
                    break;
            }
        } catch (error) {
            console.error(error);
            updateLastMessage({ type: 'error', content: `An error occurred: ${(error as Error).message}` });
        } finally {
            setFileForProcessing(null);
            setPromptForFile('');
        }
    }, [mode, aspectRatio, handleReservationLogic, cart, activeOrders, setActiveOrders, simulateOrderStatus]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
         if (mode === BotMode.MAKE_RESERVATION) {
            if (!input.trim()) return;
            handleReservationLogic(input);
            setInput('');
            return;
        }

        if (!input.trim() && !fileForProcessing) return;
        const textToSend = fileForProcessing ? promptForFile : input;
        processUserRequest(textToSend, fileForProcessing ?? undefined);
        setInput('');
        setPromptForFile('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileForProcessing(file);
            if (mode === BotMode.TRANSCRIBE_AUDIO) {
                 processUserRequest("transcribing audio...", file);
            } else {
                addMessage({author: Author.USER, type: file.type.startsWith('image') ? 'image' : 'video', content: URL.createObjectURL(file)})
            }
        }
    };
    
    const handleModeSelect = (selectedMode: BotMode) => {
        setMode(selectedMode);
        setIsMenuOpen(false);
        resetReservationFlow();
        resetOrderFlow();

        if (selectedMode === BotMode.MAKE_RESERVATION) {
            addMessage({ author: Author.BOT, type: 'text', content: "I can help with that. You can tell me the date, time, and number of guests, like 'a table for 4 tomorrow at 7pm'." });
            setReservationFlowState('idle');
            return;
        }

        const needsFile = [BotMode.IMAGE_ANALYSIS, BotMode.VIDEO_UNDERSTANDING, BotMode.IMAGE_EDIT, BotMode.VIDEO_GEN].includes(selectedMode);
        if (needsFile) {
            fileInputRef.current?.click();
        }
    };

    // --- START of Microphone Logic ---
    const startRecording = async () => {
        if (isLiveChat) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            // FIX: Use the native 'Blob' type now that the naming conflict is resolved. 'window.Blob' is not a valid type annotation.
            const audioChunks: Blob[] = [];
            recorder.ondataavailable = event => audioChunks.push(event.data);
            recorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
                addMessage({ author: Author.USER, type: 'audio', content: URL.createObjectURL(audioFile) });
                setMode(BotMode.TRANSCRIBE_AUDIO); // Switch mode for processing
                processUserRequest("transcribing audio...", audioFile);
            };
            recorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error starting recording:", err);
            addMessage({ author: Author.BOT, type: 'error', content: "Could not start recording. Please grant microphone permissions." });
        }
    };

    const stopRecording = () => {
        if (isLiveChat) return;
        mediaRecorderRef.current?.stop();
        setIsRecording(false);
    };
    
    const toggleLiveChat = () => {
        if (isLiveChat) stopLiveChat();
        else startLiveChat();
    };

    const startLiveChat = async () => {
        if (isRecording) return;
        setIsLiveChat(true);
        setMode(BotMode.LIVE_CHAT);
        addMessage({author: Author.BOT, type: 'text', content: "Live chat started. Speak into your microphone."});
        
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const outputNode = outputAudioContextRef.current.createGain();

        let nextStartTime = 0;
        const sources = new Set<AudioBufferSourceNode>();

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        liveSessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }
                        const pcmBlob: GenaiBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                        liveSessionPromiseRef.current?.then((session) => { session.sendRealtimeInput({ media: pcmBlob }); });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                     const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                     if (base64Audio && outputAudioContextRef.current) {
                        nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputNode);
                        source.addEventListener('ended', () => sources.delete(source));
                        source.start(nextStartTime);
                        nextStartTime += audioBuffer.duration;
                        sources.add(source);
                     }
                      if (message.serverContent?.interrupted) {
                          for (const source of sources.values()) { source.stop(); sources.delete(source); }
                          nextStartTime = 0;
                      }
                },
                onerror: (e: ErrorEvent) => { addMessage({author: Author.BOT, type: 'error', content: `Live chat error: ${e.message}`}); stopLiveChat(); },
                onclose: (e: CloseEvent) => { if (isLiveChat) { addMessage({author: Author.BOT, type: 'text', content: "Live chat ended."}); stopLiveChat(); } },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            },
        });
    };

    const stopLiveChat = () => {
        liveSessionPromiseRef.current?.then(session => session.close());
        liveSessionPromiseRef.current = null;
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        setIsLiveChat(false);
        setMode(BotMode.QUICK_RESPONSE);
    };
    // --- END of Microphone Logic ---
    
    const currentModeNeedsFile = [BotMode.IMAGE_ANALYSIS, BotMode.VIDEO_UNDERSTANDING, BotMode.IMAGE_EDIT, BotMode.VIDEO_GEN].includes(mode);

    return (
        <div className="flex flex-col h-full bg-gray-100 font-sans">
            <header className="bg-emerald-600 text-white p-3 flex items-center shadow-md shrink-0">
                <BotIcon className="w-10 h-10 mr-3"/>
                <div>
                    <h1 className="text-lg font-bold">BistroBot</h1>
                    <p className="text-xs">{isLiveChat ? "Live Chat Active..." : mode}</p>
                </div>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 bg-cover bg-center" style={{backgroundImage: "url('https://picsum.photos/seed/whatsappbg/1000/1500')"}}>
                <div className="flex flex-col">
                    {messages.map((msg) => <MessageBubble key={msg.id} message={msg} onActionClick={mode === BotMode.MAKE_RESERVATION ? handleReservationLogic : handleOrderLogic} />)}
                </div>
                <div ref={messagesEndRef} />
            </main>

            <footer className="bg-gray-200 p-2 shrink-0">
                 {currentModeNeedsFile && fileForProcessing && (
                    <div className="p-2 bg-white rounded-t-lg">
                        <div className="flex items-center justify-between">
                             <p className="text-sm text-gray-700 truncate">
                                Selected: <span className="font-semibold">{fileForProcessing.name}</span>
                            </p>
                            <button onClick={() => setFileForProcessing(null)}><XIcon className="w-5 h-5 text-gray-500 hover:text-red-500"/></button>
                        </div>
                        <input
                            type="text"
                            value={promptForFile}
                            onChange={(e) => setPromptForFile(e.target.value)}
                            placeholder={`Prompt for ${mode}...`}
                            className="w-full p-2 mt-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        />
                    </div>
                 )}
                 {mode === BotMode.IMAGE_GEN && (
                    <div className="p-2 text-sm text-gray-700">
                        <label className="mr-2 font-semibold">Aspect Ratio:</label>
                        <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className="border rounded p-1">
                            <option value="1:1">1:1</option>
                            <option value="16:9">16:9</option>
                            <option value="9:16">9:16</option>
                            <option value="4:3">4:3</option>
                            <option value="3:4">3:4</option>
                        </select>
                    </div>
                 )}
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                     <div className="relative">
                        <button type="button" onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-gray-300">
                            <PaperclipIcon className="w-6 h-6 text-gray-600"/>
                        </button>
                        {isMenuOpen && (
                           <div className="absolute bottom-12 left-0 bg-white shadow-lg rounded-lg w-64 p-2 z-10">
                                {Object.values(BotMode).map(m => (
                                    <button key={m} type="button" onClick={() => handleModeSelect(m)} className="w-full text-left p-2 hover:bg-gray-100 rounded text-sm text-gray-800">
                                        {m}
                                    </button>
                                ))}
                           </div>
                        )}
                    </div>
                    
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            currentModeNeedsFile ? "Upload a file to type..." :
                            mode === BotMode.MAKE_RESERVATION ? "Enter reservation details..." :
                            orderFlowState === 'customizing' ? "Select options above or type to cancel" :
                            "Type a message..."
                        }
                        disabled={currentModeNeedsFile || (mode === BotMode.MAKE_RESERVATION && reservationFlowState === 'confirming') || orderFlowState === 'customizing'}
                        className="flex-1 p-3 border-none rounded-full focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    />
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*,audio/*" />
                    
                    <button type="button" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} onContextMenu={(e) => { e.preventDefault(); toggleLiveChat(); }} className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500' : isLiveChat ? 'bg-blue-500' : 'hover:bg-gray-300'}`}>
                        {/* FIX: Replaced invalid style prop with conditional className for color change, resolving prop type error. */}
                        <MicIcon className={`w-6 h-6 ${isRecording || isLiveChat ? 'text-white' : 'text-gray-600'}`}/>
                    </button>
                    
                    <button type="submit" className="bg-emerald-500 p-3 rounded-full text-white hover:bg-emerald-600 disabled:bg-gray-400" disabled={!input.trim() && !fileForProcessing}>
                        <SendIcon className="w-6 h-6"/>
                    </button>
                </form>
            </footer>
        </div>
    );
};


const App: React.FC = () => {
    type Page = 'homepage' | 'customer' | 'admin';
    const [currentPage, setCurrentPage] = useState<Page>('homepage');
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);

    const renderPage = () => {
        switch (currentPage) {
            case 'homepage':
                return <HomePage onStartOrdering={() => setCurrentPage('customer')} />;
            case 'customer':
                return <ChatPage reservations={reservations} setReservations={setReservations} activeOrders={activeOrders} setActiveOrders={setActiveOrders} />;
            case 'admin':
                return <AdminPage reservations={reservations} orders={activeOrders} />;
        }
    };
    
    return (
        <div className="flex flex-col h-screen bg-gray-100 font-sans">
            <nav className="bg-gray-800 text-white p-2 flex justify-center items-center gap-4 text-sm font-semibold shadow-md z-20">
                 <button onClick={() => setCurrentPage('homepage')} className={`px-3 py-1 rounded-md transition-colors ${currentPage === 'homepage' ? 'bg-emerald-500' : 'hover:bg-gray-700'}`}>Home</button>
                 <button onClick={() => setCurrentPage('customer')} className={`px-3 py-1 rounded-md transition-colors ${currentPage === 'customer' ? 'bg-emerald-500' : 'hover:bg-gray-700'}`}>Customer Chat</button>
                 <button onClick={() => setCurrentPage('admin')} className={`px-3 py-1 rounded-md transition-colors ${currentPage === 'admin' ? 'bg-emerald-500' : 'hover:bg-gray-700'}`}>Admin</button>
            </nav>
            <div className="flex-1 overflow-hidden">
                {renderPage()}
            </div>
        </div>
    );
}

export default App;
