
import { GoogleGenAI, Type } from "@google/genai";

export interface DesignSuggestion {
  backgroundColor: string;
  designTip: string;
}

export const generateDesignStyle = async (collageDataUrl: string): Promise<DesignSuggestion> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const base64Data = collageDataUrl.split(',')[1];
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: "Analyze the colors and mood of these images in the collage. Suggest a single best background hex color that complements all images. Also provide one short professional design tip (max 15 words) for this specific set of photos. Return the response in JSON format. Use Chinese for the designTip." },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data
            }
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            backgroundColor: { 
              type: Type.STRING,
              description: "The hex color code (e.g. #F5F5F5) recommended for the background."
            },
            designTip: { 
              type: Type.STRING,
              description: "A short design tip in Chinese."
            }
          },
          required: ["backgroundColor", "designTip"]
        }
      }
    });
    
    return JSON.parse(response.text || "{}") as DesignSuggestion;
  } catch (error) {
    console.error("Gemini Error:", error);
    return { 
      backgroundColor: "#ffffff", 
      designTip: "AI 暫時無法連線，建議手動調整背景色以突顯照片。" 
    };
  }
};
