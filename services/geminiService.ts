
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, GenerateContentResponse, Tool, HarmCategory, HarmBlockThreshold, Content, Part } from "@google/genai";
import { LegalAnalysisResult, UploadedFile } from '../types';

const API_KEY = process.env.API_KEY || (typeof window !== 'undefined' ? (window as any).GEMINI_API_KEY : undefined);
let ai: GoogleGenAI;

// Using the most capable model
const MODEL_NAME = "gemini-3-pro-preview"; 

const getAiInstance = (): GoogleGenAI => {
  if (!API_KEY) {
    throw new Error("Gemini API Key not configured.");
  }
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return ai;
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

const ANALYST_SYSTEM_INSTRUCTION = `Вы — LexHelper, интеллектуальная система юридического анализа.
Ваша задача — проанализировать ситуацию пользователя, документы (если есть) и дать экспертную правовую оценку по законам РФ.

ВХОДНЫЕ ДАННЫЕ:
1. Категория дела (может быть "Свой случай").
2. Роль пользователя.
3. Описание и файлы.

РЕЖИМ "CLARIFICATION" (Уточнение):
Если информации критически мало для анализа (нет фактов, дат, сути спора), верни JSON с полем "clarifyingQuestions" (2-3 вопроса). Остальные поля заполни заглушками.

РЕЖИМ "ANALYSIS" (Анализ):
Используй свои возможности рассуждения (Thinking), чтобы выстроить логическую цепочку.
1. Проанализируй факты и приложенные документы (изображения/PDF).
2. Определи применимые нормы права (ГК, УК, КоАП, ТК РФ и др.).
3. Оцени шансы и риски.

ФОРМАТ ОТВЕТА (JSON):
{
  "reasoningTrace": ["Шаг 1: Анализ фактов...", "Шаг 2: Квалификация...", "Шаг 3: Вывод..."], 
  "summary": "Четкий вывод для клиента.",
  "clarifyingQuestions": [], 
  "strengths": ["Сильный довод 1"],
  "risks": ["Риск 1"],
  "legalStrengthScore": 0-100,
  "evidenceAssessment": {
    "present": ["Что видно из описания/файлов"],
    "missing": ["Что нужно найти"]
  },
  "deadlines": {
    "status": "В норме / Критично",
    "info": "Статья закона о сроках."
  },
  "strategy": {
    "negotiation": "План для досудебного решения.",
    "court": "План для суда."
  },
  "recommendedDocuments": ["Исковое заявление", "Претензия"]
}`;

export const analyzeLegalCase = async (
  userId: string | number,
  category: string,
  role: string,
  details: string,
  urls: string[],
  files: UploadedFile[] = []
): Promise<LegalAnalysisResult> => {
  console.log(`[GeminiService] Starting Analysis for ${category}/${role} (User: ${userId})`);
  
  const currentAi = getAiInstance();
  
  // Construct parts with text and optional files
  const promptText = `КАТЕГОРИЯ: ${category}\nРОЛЬ: ${role}\n\nОПИСАНИЕ:\n${details}\n\nПожалуйста, проанализируй ситуацию, документы (если приложены) и дай стратегию.`;
  
  const contentParts: Part[] = [{ text: promptText }];

  // Add files to the prompt (images/pdfs)
  files.forEach(file => {
    // Strip base64 prefix if present (e.g., "data:image/png;base64,")
    const base64Data = file.data.split(',')[1] || file.data;
    contentParts.push({
      inlineData: {
        mimeType: file.type,
        data: base64Data
      }
    });
  });
  
  // URL context is handled via Tools if needed, or appended to prompt logic
  // For simplicity in this structure, we rely on the model's internal knowledge + uploaded files
  // If Search Grounding is needed, we add it to tools.
  
  const tools: Tool[] = [];
  // Uncomment to enable Google Search if needed for current laws
  // tools.push({ googleSearch: {} });

  const contents: Content[] = [{ role: "user", parts: contentParts }];

  try {
    console.log(`[GeminiService] Sending request to model: ${MODEL_NAME}`);
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: { 
        tools: tools,
        safetySettings: safetySettings,
        systemInstruction: ANALYST_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        // Enable Thinking for deeper analysis (Gemini 3 Feature)
        thinkingConfig: { thinkingBudget: 4096 }, 
      },
    });

    const text = response.text;
    console.log(`[GeminiService] Response received. Length: ${text?.length || 0}`);
    
    if (!text) {
        console.error("[GeminiService] Empty response text:", response);
        throw new Error("No response text");
    }
    
    // Attempt parsing
    try {
        const parsed = JSON.parse(text) as LegalAnalysisResult;
        console.log("[GeminiService] JSON parsed successfully");
        return parsed;
    } catch (parseError) {
        console.error("[GeminiService] JSON Parse Error:", parseError, "Raw Text:", text);
        throw new Error("Failed to parse AI response");
    }

  } catch (error: any) {
    console.error("❌ [GeminiService] Analysis Failed:", error);
    
    if (error.response) {
        console.error("Error Response Data:", error.response);
    }

    // ALWAYS Return Detailed Debug Info for troubleshooting
    return {
      summary: `⚠️ ОШИБКА: ${error.message || "Неизвестная ошибка"}`,
      reasoningTrace: [
        "❌ Сбой анализа",
        `Error Name: ${error.name}`,
        `Stack: ${error.stack || 'No stack'}`,
        error.response ? `Response: ${JSON.stringify(error.response)}` : "No response data",
        `User ID: ${userId}`
      ],
      strengths: [],
      risks: [
        "ТЕХНИЧЕСКИЕ ДЕТАЛИ:",
        `Код: ${error.code || 'UNKNOWN'}`,
        `Сообщение: ${error.toString()}`,
        "Пожалуйста, отправьте скриншот разработчику."
      ],
      legalStrengthScore: 0,
      evidenceAssessment: { present: [], missing: [] },
      deadlines: { status: "Сбой", info: new Date().toLocaleTimeString() },
      strategy: { negotiation: "Ошибка", court: "Ошибка" },
      recommendedDocuments: []
    };
  }
};

const DOC_GENERATOR_SYSTEM_INSTRUCTION = `Вы — генератор юридических документов РФ.
Составь документ на основе данных. Используй плейсхолдеры [Данные]. Официальный стиль.
`;

export const generateLegalDocument = async (
  docName: string,
  category: string,
  role: string,
  details: string
): Promise<string> => {
  const currentAi = getAiInstance();
  
  const fullPrompt = `ЗАДАЧА: ${docName}\nКАТЕГОРИЯ: ${category}\nРОЛЬ: ${role}\nОПИСАНИЕ: ${details}`;

  const contents: Content[] = [{ role: "user", parts: [{ text: fullPrompt }] }];

  try {
    const response: GenerateContentResponse = await currentAi.models.generateContent({
      model: MODEL_NAME, // Use the smart model for docs too
      contents: contents,
      config: { 
        safetySettings: safetySettings,
        systemInstruction: DOC_GENERATOR_SYSTEM_INSTRUCTION,
      },
    });

    return response.text || "Ошибка генерации";
  } catch (error) {
    console.error("Doc Gen Error:", error);
    return "Не удалось создать документ.";
  }
};

// Deprecated stubs
export const generateContentWithUrlContext = async () => ({ text: "" });
export const getInitialSuggestions = async () => ({ text: "{}" });
