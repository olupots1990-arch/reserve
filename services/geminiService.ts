
import { GoogleGenAI, Modality, GenerateContentResponse, Type } from "@google/genai";
import { fileToBase64 } from "../utils/fileUtils";

const getGeminiAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuickResponse = async (prompt: string): Promise<GenerateContentResponse> => {
    const ai = getGeminiAI();
    return await ai.models.generateContent({
        // FIX: Use the recommended model name for gemini flash lite.
        model: 'gemini-flash-lite-latest',
        contents: prompt,
    });
};

export const generateThinkingResponse = async (prompt: string): Promise<GenerateContentResponse> => {
    const ai = getGeminiAI();
    return await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 },
        },
    });
};

export const transcribeAudio = async (audioFile: File): Promise<GenerateContentResponse> => {
    const ai = getGeminiAI();
    const audioBase64 = await fileToBase64(audioFile);
    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: "Transcribe this audio recording of a customer's request at a restaurant." },
                { inlineData: { mimeType: audioFile.type, data: audioBase64 } }
            ]
        }
    });
};

export const generateImage = async (prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" | "4:3" | "3:4"): Promise<string> => {
    const ai = getGeminiAI();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio,
        },
    });
    return response.generatedImages[0].image.imageBytes;
};


export const analyzeVideo = async (videoFile: File, prompt: string): Promise<GenerateContentResponse> => {
    const ai = getGeminiAI();
    const videoBase64 = await fileToBase64(videoFile);
    return await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { mimeType: videoFile.type, data: videoBase64 } }
            ]
        }
    });
};

export const analyzeImage = async (imageFile: File, prompt: string): Promise<GenerateContentResponse> => {
    const ai = getGeminiAI();
    const imageBase64 = await fileToBase64(imageFile);
    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { mimeType: imageFile.type, data: imageBase64 } }
            ]
        }
    });
};

export const generateSpeech = async (text: string): Promise<string> => {
    const ai = getGeminiAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ parts: [{ text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ?? "";
};

export const searchWithGoogle = async (prompt: string): Promise<GenerateContentResponse> => {
    const ai = getGeminiAI();
    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }],
        },
    });
};

export const searchWithMaps = async (prompt: string, latitude: number, longitude: number): Promise<GenerateContentResponse> => {
    const ai = getGeminiAI();
    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
                retrievalConfig: {
                    latLng: { latitude, longitude },
                },
            },
        },
    });
};

export const editImage = async (imageFile: File, prompt: string): Promise<string> => {
    const ai = getGeminiAI();
    const imageBase64 = await fileToBase64(imageFile);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType: imageFile.type, data: imageBase64 } },
                { text: prompt },
            ]
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("No image generated");
};

export const extractReservationDetails = async (prompt: string): Promise<{date: string | null, time: string | null, guests: number | null}> => {
    const ai = getGeminiAI();
    const today = new Date().toISOString().split('T')[0];

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Today's date is ${today}. Extract reservation details from the following user request: "${prompt}"`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    date: {
                        type: Type.STRING,
                        description: 'The date of the reservation in YYYY-MM-DD format. Infer from context like "tomorrow". Return null if not specified.',
                    },
                    time: {
                        type: Type.STRING,
                        description: 'The time of the reservation in HH:MM (24-hour) format. Return null if not specified.',
                    },
                    guests: {
                        type: Type.INTEGER,
                        description: 'The number of guests for the reservation. Return null if not specified.',
                    },
                },
            },
        },
    });

    try {
        return JSON.parse(response.text);
    } catch (e) {
        console.error("Failed to parse reservation details JSON:", e);
        return { date: null, time: null, guests: null };
    }
};


export const generateVideoFromImage = async (imageFile: File, prompt: string, aspectRatio: '16:9' | '9:16') => {
    const ai = getGeminiAI();
    const imageBase64 = await fileToBase64(imageFile);

    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this image subtly.',
        image: {
            imageBytes: imageBase64,
            mimeType: imageFile.type,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
    });

    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation failed.");
    }
    
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const videoBlob = await response.blob();
    return URL.createObjectURL(videoBlob);
};