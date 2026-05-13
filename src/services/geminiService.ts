import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ClassificationResult {
  breed: string;
  confidence: string;
  matchPercentage?: number;
  rarity?: string;
  isIndigenous?: boolean;
  description: string;
  characteristics: string[];
  origin: string;
  usage: string;
  estimatedPrice?: string;
  estimatedAge?: string;
  timeRemaining?: string;
  currentDiseases?: string;
  expectedDiseases?: string[];
  diseaseSolutions?: string;
  thingsToAvoid?: string[];
  similarBreeds?: string[];
  feedingHabits?: string;
  optimalClimaticConditions?: string;
  malnourishmentStatus?: string;
  expectedBodyWeight?: string;
  approximateBodyWeight?: string;
  breedComparisons?: { candidateName: string; comparisonText: string; keyDifferences: string[] }[];
  vaccines?: { name: string; cost: string; schedule: string }[];
  dewormingSchedule?: string;
  checkupSchedule?: string;
  pdfLabels?: Record<string, string>;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: any[];
}

export async function askFarmerAssistant(imageData: string | null, mimeType: string, question: string, history: ChatMessage[], result: ClassificationResult | null, preferredLanguage: string = "English"): Promise<string> {
  const model = "gemini-3-flash-preview";

  const contents: ChatMessage[] = [];

  const userParts: any[] = [];

  if (imageData) {
    userParts.push({
      inlineData: {
        mimeType: mimeType,
        data: imageData.split(',')[1],
      },
    });
    userParts.push({ text: question });
  } else {
    userParts.push({ text: question });
  }

  const explicitInstruction = `Please answer ONLY in ${preferredLanguage}. ${question}`;

  if (history.length === 0) {
    userParts[userParts.length - 1].text = explicitInstruction;
    contents.push({
      role: 'user',
      parts: userParts
    });
  } else {
    contents.push(...history);
    contents.push({
      role: 'user',
      parts: [{ text: explicitInstruction }]
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        systemInstruction: `You are an expert AI Chat Assistant for Farmers specializing in cattle health, breed advice, and farm management. You MUST respond in ${preferredLanguage}. ${
          imageData 
            ? "A user has uploaded an image of their cattle." 
            : "The user has not uploaded an image of their cattle. If the question relates to identifying a cattle or requires visual context, kindly ask them to upload an image or provide more details about the cattle."
        } ${
          result && result.breed !== "Unknown" 
            ? `The currently analyzed cattle breed is ${result.breed} (Origin: ${result.origin}). The ML analysis noted the following characteristics: ${result.characteristics.join(', ')}. Use this context to inform your answers when relevant.`
            : ""
        } Respond in Markdown format and be conversational, helpful, and empathetic. Provide clear, well-structured answers in ${preferredLanguage}.`
      }
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    return response.text;
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    const errorStr = String(error);
    const isRateLimit = error?.status === 429 || errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota");
    
    if (isRateLimit) {
      throw new Error("API rate limit exceeded. Please wait a moment and try again.");
    }
    if ((error.message && error.message.toLowerCase().includes("api key")) || errorStr.toLowerCase().includes("api key")) {
      throw new Error("Missing or invalid API Key. Please provide a valid GEMINI_API_KEY in your .env file.");
    }
    const details = error.message || errorStr;
    throw new Error(`Failed to process your question: ${details}`);
  }
}


export async function translateClassificationResult(result: ClassificationResult, language: string, retries = 3): Promise<ClassificationResult> {
  if (language === "English") return result;

  const model = "gemini-3-flash-preview";
  const prompt = `Translate the following JSON object strictly into ${language}. You must strictly output ALL translated values in ${language}. DO NOT leave any string values in English, especially the 'description' (Technical Description) and 'characteristics' (Key Morphological Characteristics) which MUST be translated. Keep the exact same JSON keys, only translate the values. If a value is an array of strings, translate each string in the array. Do not translate the keys themselves. If you do not know the exact translation, provide your best, most accurate translation in ${language}.

JSON to translate:
${JSON.stringify(result, null, 2)}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: `You are an expert translator. Your job is to translate the JSON values STRICTLY into ${language}. Do not leave any text, no matter how long, in English. You MUST translate 'description' and 'characteristics'. DO NOT OMIT any keys from the incoming JSON.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              breed: { type: Type.STRING },
              confidence: { type: Type.STRING },
              matchPercentage: { type: Type.NUMBER },
              rarity: { type: Type.STRING },
              isIndigenous: { type: Type.BOOLEAN },
              description: { type: Type.STRING, description: `The translated technical description in ${language}` },
              characteristics: { type: Type.ARRAY, items: { type: Type.STRING }, description: `The translated characteristics in ${language}` },
              origin: { type: Type.STRING },
              usage: { type: Type.STRING },
              estimatedPrice: { type: Type.STRING },
              estimatedAge: { type: Type.STRING },
              timeRemaining: { type: Type.STRING },
              currentDiseases: { type: Type.STRING },
              expectedDiseases: { type: Type.ARRAY, items: { type: Type.STRING } },
              diseaseSolutions: { type: Type.STRING },
              thingsToAvoid: { type: Type.ARRAY, items: { type: Type.STRING } },
              feedingHabits: { type: Type.STRING },
              optimalClimaticConditions: { type: Type.STRING },
              isMalnourished: { type: Type.BOOLEAN },
              idealBodyWeight: { type: Type.STRING },
              estimatedBodyWeight: { type: Type.STRING },
              similarBreeds: { type: Type.ARRAY, items: { type: Type.STRING } },
              breedComparisons: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    candidateName: { type: Type.STRING },
                    comparisonText: { type: Type.STRING },
                    keyDifferences: { type: Type.ARRAY, items: { type: Type.STRING } }
                  }
                }
              },
              vaccines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    schedule: { type: Type.STRING },
                    cost: { type: Type.STRING }
                  }
                }
              },
              dewormingSchedule: { type: Type.STRING },
              checkupSchedule: { type: Type.STRING },
              pdfLabels: {
                type: Type.OBJECT,
                description: "Map of English UI labels translated to the target language",
                properties: {
                  reportTitle: { type: Type.STRING },
                  reportUid: { type: Type.STRING },
                  dateText: { type: Type.STRING },
                  languageText: { type: Type.STRING },
                  category: { type: Type.STRING },
                  indigenousIndianBreed: { type: Type.STRING },
                  foreignGlobalBreed: { type: Type.STRING },
                  origin: { type: Type.STRING },
                  confidence: { type: Type.STRING },
                  usage: { type: Type.STRING },
                  estimatedPrice: { type: Type.STRING },
                  estimatedAge: { type: Type.STRING },
                  timeRemaining: { type: Type.STRING },
                  technicalDescription: { type: Type.STRING },
                  keyMorphologicalCharacteristics: { type: Type.STRING },
                  similarBreedsConsidered: { type: Type.STRING },
                  breedComparisons: { type: Type.STRING },
                  comparisonText: { type: Type.STRING },
                  feedingHabits: { type: Type.STRING },
                  climateLivingConditions: { type: Type.STRING },
                  healthAnalysis: { type: Type.STRING },
                  visibleSigns: { type: Type.STRING },
                  proneAilments: { type: Type.STRING },
                  solutionsTreatments: { type: Type.STRING },
                  thingsToAvoid: { type: Type.STRING },
                  dewormingSchedule: { type: Type.STRING },
                  checkupSchedule: { type: Type.STRING },
                  recommendedVaccines: { type: Type.STRING }
                }
              }
            },
            required: [
              "breed", "description", "characteristics", "origin", "usage", 
              "similarBreeds", "breedComparisons", "feedingHabits", 
              "optimalClimaticConditions", "diseaseSolutions", "thingsToAvoid",
              "dewormingSchedule", "checkupSchedule", "pdfLabels"
            ]
          }
        }
      });

      if (!response.text) {
        throw new Error("Empty response from AI");
      }

      const translatedResult: ClassificationResult = JSON.parse(response.text);
      return translatedResult;
    } catch (error: any) {
      console.error(`Translation Error (Attempt ${attempt}/${retries}):`, error);
      
      const isRateLimit = error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("quota");
      
      if (isRateLimit && attempt < retries) {
        const delay = attempt * 2000; // 2s, 4s
        console.log(`Rate limited. Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (isRateLimit) {
        throw new Error("API rate limit exceeded. Please try again after a minute.");
      }
      
      throw new Error("Failed to translate the classification result.");
    }
  }
  
  throw new Error("Failed to translate the classification result after retries.");
}

export async function classifyCattleBreed(imageData: string, mimeType: string, retries = 3): Promise<ClassificationResult> {
  const model = "gemini-3-flash-preview";

  const prompt = `
    You are an expert veterinarian and global cattle breed specialist.
    Analyze the provided image and identify the cattle breed, regardless of its global origin.
    
    Clearly state if the detected breed is an 'Indigenous Indian Breed' or not.
    List 1-3 visually similar Indigenous Indian breeds as alternative candidates. These MUST ONLY be Indigenous Indian breeds, even if the primary breed identified is a foreign breed. DO NOT list any foreign breeds as alternative candidates. If the cattle is a foreign breed, compare it to the closest looking Indian breeds. For breed comparisons, make sure to strictly compare the main breed against the alternative candidate ONLY, do not mention any third breeds.
    Provide an approximate market price range. If the cattle is indigenous to India, provide the price in Indian Rupees (INR). If it is a foreign breed, provide the price in both its country of origin's currency and Indian Rupees (INR) (e.g., "$1,500 - $3,000 USD (₹1,25,000 - ₹2,50,000 INR)").
    Estimate the current age of the cattle based on visual indicators.
    Also estimate the time remaining (e.g., remaining productive life or lifespan) for this cattle.
    Analyze the image for any signs of current diseases or health issues the cattle might be experiencing.
    List expected diseases or common ailments that this specific breed is prone to.
    Provide solutions, treatments, or preventive measures for the identified current or expected diseases.
    List things to avoid with this cattle (e.g., specific foods, extreme conditions, certain handling practices).
    Include specific details about their typical feeding habits and the optimal climatic/living conditions for their survival.
    Analyze if the cattle is malnourished or not.
    Tell what should be its expected ideal body weight.
    Estimate the approximate body weight by observing the picture.
    Compare the main breed with the alternative candidate breeds, explaining the key differences.
    Provide a list of necessary vaccines for this breed, including estimated costs and when to administer them.
    Advise on the appropriate deworming schedule (how often should it be given).
    Advise on the appropriate general health checkup schedule.
    If the image does not contain a cattle, or you cannot identify the breed, set breed to "Unknown".
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageData.split(',')[1],
            },
          },
        ],
      },
      config: {
        temperature: 0.1,
        topP: 0.1,
        topK: 1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            breed: { type: Type.STRING, description: "Common name of the breed or 'Unknown'" },
            confidence: { type: Type.STRING, description: "Confidence level (High, Medium, Low) or a percentage like '95%'" },
            matchPercentage: { type: Type.NUMBER, description: "An exact numeric match percentage from 0 to 100 based on ML analysis." },
            rarity: { type: Type.STRING, description: "The relative rarity of the breed (e.g. 'Common', 'Rare', 'Endangered')" },
            isIndigenous: { type: Type.BOOLEAN, description: "Set to true if this is an indigenous Indian breed, otherwise false." },
            description: { type: Type.STRING, description: "2-3 sentences summary of the breed" },
            characteristics: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 4-5 key physical characteristics"
            },
            origin: { type: Type.STRING, description: "Region of origin" },
            usage: { type: Type.STRING, description: "Primary usage (Milk, Draught, Dual purpose)" },
            estimatedPrice: { type: Type.STRING, description: "Approximated market price range in INR (e.g., '₹40,000 - ₹60,000')" },
            estimatedAge: { type: Type.STRING, description: "Estimated age of the cattle based on visual indicators (e.g., '3-4 years')" },
            timeRemaining: { type: Type.STRING, description: "Estimated remaining productive life or lifespan (e.g., '6-8 years remaining')" },
            currentDiseases: { type: Type.STRING, description: "Any diseases or health issues visible in the image, or 'Appears healthy'" },
            expectedDiseases: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of diseases or ailments this breed is commonly prone to"
            },
            diseaseSolutions: { type: Type.STRING, description: "Recommended solutions or treatments for current/expected diseases" },
            thingsToAvoid: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Things to avoid with this cattle, such as toxic foods, poor handling, or bad environments"
            },
            feedingHabits: { type: Type.STRING, description: "Typical feeding habits of the breed" },
            optimalClimaticConditions: { type: Type.STRING, description: "Living conditions appropriate for their survival" },
            malnourishmentStatus: { type: Type.STRING, description: "Whether the cattle is Malnourished, Healthy, or Borderline. E.g. 'Malnourished'" },
            expectedBodyWeight: { type: Type.STRING, description: "The expected ideal body weight for this breed/age. E.g. '450 - 550 kg'" },
            approximateBodyWeight: { type: Type.STRING, description: "The estimated approximate body weight of the cattle in the picture. E.g. '300 kg'" },
            dewormingSchedule: { type: Type.STRING, description: "How often deworming should occur. E.g. 'Every 3-4 months'" },
            checkupSchedule: { type: Type.STRING, description: "How often general health checkups should occur. E.g. 'Twice a year'" },
            vaccines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the vaccine" },
                  cost: { type: Type.STRING, description: "Estimated cost of the vaccine" },
                  schedule: { type: Type.STRING, description: "When to administer the vaccine" }
                }
              },
              description: "List of necessary vaccines and costs"
            },
            similarBreeds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 1-3 Indigenous Indian breeds that look similar to this specimen but were not chosen as the primary prediction"
            },
            breedComparisons: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  candidateName: { type: Type.STRING, description: "The name of the alternative candidate breed. MUST be an Indigenous Indian breed." },
                  comparisonText: { type: Type.STRING, description: "Detailed comparison explaining the differences strictly between the main breed and this specific alternative candidate ONLY. Do not mention or compare with any other third breed in this text." },
                  keyDifferences: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List of 2-3 key differences (e.g. 'Horn shape', 'Color variations')"
                  }
                }
              },
              description: "Comparison between the main breed and key alternative candidates"
            }
          },
          required: ["breed", "confidence", "matchPercentage", "rarity", "isIndigenous", "description", "characteristics", "origin", "usage", "estimatedPrice", "feedingHabits", "optimalClimaticConditions", "currentDiseases"]
        }
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI");
    }

    const result = JSON.parse(response.text);
    return result as ClassificationResult;
  } catch (error: any) {
    console.error(`Gemini Classification Error:`, error);
    
    const errorStr = String(error);
    const isRateLimit = error?.status === 429 || errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || errorStr.includes("quota");
    
    if (isRateLimit) {
      throw new Error("API rate limit exceeded. Please wait a moment and try again.");
    }
    
    // Check if error is related to API key
    if ((error.message && error.message.toLowerCase().includes("api key")) || errorStr.toLowerCase().includes("api key")) {
      throw new Error("Missing or invalid API Key. Please provide a valid GEMINI_API_KEY in your .env file.");
    }
    
    const details = error.message || errorStr;
    throw new Error(`Failed to classify the image: ${details}`);
  }
}
