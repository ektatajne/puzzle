
import { GoogleGenAI, Type } from "@google/genai";
import type { AnalysisResult } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      return response.generatedImages[0].image.imageBytes;
    } else {
      throw new Error("Image generation failed, no images returned.");
    }
  } catch (error) {
    console.error("Error calling Gemini API for image generation:", error);
    throw new Error("Failed to generate image from Gemini API.");
  }
};


const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    accuracy: {
      type: Type.NUMBER,
      description: "A percentage from 0 to 100 representing how well the user's prompt would replicate the image generated from the original prompt.",
    },
    rating: {
      type: Type.NUMBER,
      description: "A rating from 1 to 10 based on the user's prompt's clarity, detail, and overall quality for image generation.",
    },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
      },
      description: "An array of short, actionable suggestions for how the user could improve their prompt to better match the original image.",
    },
  },
  required: ["accuracy", "rating", "suggestions"],
};


export const analyzePrompt = async (originalPrompt: string, userPrompt: string): Promise<AnalysisResult> => {
  const systemInstruction = `You are a world-class prompt engineering analyst specializing in AI image generation. Your task is to evaluate a user's prompt based on how well it would replicate an image generated from an original, secret prompt. Analyze the user's prompt for its inclusion of key subjects, art style, details, and composition from the original prompt. Provide your analysis strictly in the specified JSON format.`;
  
  const contentPrompt = `
    ORIGINAL PROMPT (used to generate the image): "${originalPrompt}"
    
    USER'S PROMPT (attempting to describe the image): "${userPrompt}"
    
    Please analyze the user's prompt and provide your evaluation on how accurately it would regenerate the image from the original prompt.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contentPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.3,
      },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText) as AnalysisResult;
    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get analysis from Gemini API.");
  }
};
