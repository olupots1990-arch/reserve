
import React, { useState, useRef, useEffect, useCallback } from 'react';
// FIX: Alias 'Blob' from '@google/genai' to 'GenaiBlob' to resolve the name conflict with the browser's native 'Blob' type.
import { GoogleGenAI, LiveServerMessage, Modality, Blob as GenaiBlob } from '@google/genai';
import { Author, BotMode, Message, GroundingChunk, Reservation } from './types';
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
const MessageBubble: React.FC<{ message: Message; onActionClick?: (payload: string) => void; }> = ({ message, onActionClick }) => {
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
// --- END of Child Components ---

const App: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { id: 'welcome', author: Author.BOT, type: 'text', content: "Welcome to The Gemini Bistro! I'm BistroBot. How can I help you today? You can ask for my menu, make a reservation, or try one of my special features from the paperclip menu." },
    ]);
    const [input, setInput] = useState('');
    const [mode, setMode] = useState<BotMode>(BotMode.QUICK_RESPONSE);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isLiveChat, setIsLiveChat] = useState(false);
    
    // Reservation State
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [reservationFlowState, setReservationFlowState] = useState<'idle' | 'collecting_date' | 'collecting_time' | 'collecting_guests' | 'confirming'>('idle');
    const [pendingReservation, setPendingReservation] = useState<Partial<Reservation>>({});

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
            if (lastMessage && (lastMessage.type === 'loading' || lastMessage.type === 'text')) {
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

    // --- START of Reservation Logic ---
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

            case 'collecting_date':
                currentDetails.date = text;
                setPendingReservation(currentDetails);
                askForMissingInfo(currentDetails);
                break;

            case 'collecting_time':
                currentDetails.time = text;
                setPendingReservation(currentDetails);
                askForMissingInfo(currentDetails);
                break;

            case 'collecting_guests':
                const guests = parseInt(text, 10);
                if (!isNaN(guests) && guests > 0) {
                    currentDetails.guests = guests;
                    setPendingReservation(currentDetails);
                    askForMissingInfo(currentDetails);
                } else {
                    addMessage({ author: Author.BOT, type: 'text', content: "Please enter a valid number for guests." });
                }
                break;

            case 'confirming':
                if (text === 'CONFIRM_RESERVATION') {
                    const finalReservation = pendingReservation as Reservation;
                    setReservations(prev => [...prev, finalReservation]);
                    addMessage({
                        author: Author.BOT,
                        type: 'text',
                        content: `Excellent! Your table for ${finalReservation.guests} is booked for ${finalReservation.date} at ${finalReservation.time}. We look forward to seeing you!`
                    });
                    resetReservationFlow();
                } else if (text === 'CANCEL_RESERVATION') {
                    addMessage({ author: Author.BOT, type: 'text', content: "No problem, I've cancelled the reservation process." });
                    resetReservationFlow();
                }
                break;
        }
    }, [reservationFlowState, pendingReservation, askForMissingInfo]);
    // --- END of Reservation Logic ---
    
    const processUserRequest = useCallback(async (text: string, file?: File) => {
        addMessage({ author: Author.USER, type: 'text', content: text, prompt: file ? text : undefined });
        addMessage({ author: Author.BOT, type: 'loading', content: '' });

        try {
            let response;
            switch(mode) {
                case BotMode.THINKING:
                    response = await geminiService.generateThinkingResponse(text);
                    updateLastMessage({ type: 'text', content: response.text });
                    break;
                case BotMode.SEARCH_GROUNDING:
                    response = await geminiService.searchWithGoogle(text);
                    updateLastMessage({ type: 'text', content: response.text, grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks });
                    break;
                case BotMode.MAPS_GROUNDING:
                    handleGeolocation(async (lat, lon) => {
                        response = await geminiService.searchWithMaps(text, lat, lon);
                         updateLastMessage({ type: 'text', content: response.text, grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks });
                    });
                    break;
                case BotMode.IMAGE_ANALYSIS:
                    if (!file) throw new Error("Please upload an image for analysis.");
                    response = await geminiService.analyzeImage(file, text);
                    updateLastMessage({ type: 'text', content: response.text });
                    break;
                 case BotMode.VIDEO_UNDERSTANDING:
                    if (!file) throw new Error("Please upload a video for analysis.");
                    response = await geminiService.analyzeVideo(file, text);
                    updateLastMessage({ type: 'text', content: response.text });
                    break;
                case BotMode.IMAGE_EDIT:
                    if (!file) throw new Error("Please upload an image to edit.");
                    const editedImageBase64 = await geminiService.editImage(file, text);
                    updateLastMessage({ type: 'image', content: `data:image/png;base64,${editedImageBase64}`, prompt: text });
                    break;
                case BotMode.IMAGE_GEN:
                    const imageBase64 = await geminiService.generateImage(text, aspectRatio);
                    updateLastMessage({ type: 'image', content: `data:image/jpeg;base64,${imageBase64}`, prompt: text });
                    break;
                case BotMode.VIDEO_GEN:
                    if (!file) throw new Error("Please upload an image to animate.");
                    
                    const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
                    if (!hasKey) {
                       updateLastMessage({ type: 'veo_api_key', content: "To generate a video with Veo, you need to select a personal API key. This is required for long-running jobs." });
                       return;
                    }
                    try {
                        const videoUrl = await geminiService.generateVideoFromImage(file, text, aspectRatio === '9:16' ? '9:16' : '16:9');
                        updateLastMessage({ type: 'video', content: videoUrl, prompt: text });
                    } catch (e: any) {
                         if (e.message?.includes("Requested entity was not found")) {
                              updateLastMessage({ type: 'veo_api_key', content: "Your API key seems to be invalid. Please select a valid key to proceed with video generation." });
                         } else {
                            throw e;
                         }
                    }
                    break;
                case BotMode.SPEECH_GEN:
                    const speechBase64 = await geminiService.generateSpeech(text);
                    updateLastMessage({ type: 'audio', content: `data:audio/wav;base64,${speechBase64}` });
                    break;
                case BotMode.TRANSCRIBE_AUDIO:
                    if (!file) throw new Error("No audio file provided for transcription.");
                    response = await geminiService.transcribeAudio(file);
                    addMessage({ author: Author.BOT, type: 'text', content: `Transcription: "${response.text}"` });
                    // Remove loading message
                    setMessages(prev => prev.filter(m => m.type !== 'loading'));
                    break;
                case BotMode.QUICK_RESPONSE:
                default:
                    if (/(reservation|book a table)/i.test(text)) {
                        setMode(BotMode.MAKE_RESERVATION);
                        handleReservationLogic(text);
                        return;
                    }
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
    }, [mode, aspectRatio, handleReservationLogic]);
    
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
                        // FIX: Replaced inefficient .map with a loop for performance and to resolve potential type issues.
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        // FIX: Use the aliased `GenaiBlob` type for the payload to `sendRealtimeInput`.
                        const pcmBlob: GenaiBlob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        liveSessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
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
                          for (const source of sources.values()) {
                              source.stop();
                              sources.delete(source);
                          }
                          nextStartTime = 0;
                      }
                },
                onerror: (e: ErrorEvent) => {
                    addMessage({author: Author.BOT, type: 'error', content: `Live chat error: ${e.message}`});
                    stopLiveChat();
                },
                onclose: (e: CloseEvent) => {
                    if (isLiveChat) { // only show message if it wasn't a manual close
                        addMessage({author: Author.BOT, type: 'text', content: "Live chat ended."});
                        stopLiveChat();
                    }
                },
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
        <div className="flex flex-col h-screen bg-gray-100 font-sans">
            <header className="bg-emerald-600 text-white p-3 flex items-center shadow-md">
                <BotIcon className="w-10 h-10 mr-3"/>
                <div>
                    <h1 className="text-lg font-bold">BistroBot</h1>
                    <p className="text-xs">{isLiveChat ? "Live Chat Active..." : mode}</p>
                </div>
            </header>
            
            <main className="flex-1 overflow-y-auto p-4 bg-cover bg-center" style={{backgroundImage: "url('https://picsum.photos/seed/whatsappbg/1000/1500')"}}>
                <div className="flex flex-col">
                    {messages.map((msg) => <MessageBubble key={msg.id} message={msg} onActionClick={handleReservationLogic} />)}
                </div>
                <div ref={messagesEndRef} />
            </main>

            <footer className="bg-gray-200 p-2">
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
                            "Type a message..."
                        }
                        disabled={currentModeNeedsFile || (mode === BotMode.MAKE_RESERVATION && reservationFlowState === 'confirming')}
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

export default App;
