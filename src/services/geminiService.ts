import { GoogleGenAI } from "@google/genai";
import { Transaction, Account } from "../types";

export async function getFinancialAdvice(
  userMessage: string,
  transactions: Transaction[],
  accounts: Account[]
) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are Aura, an intelligent financial advisor for Aura AI Bank. 
        You have access to the user's accounts and recent transactions.
        Provide concise, helpful, and personalized financial advice.
        Be professional yet approachable.
        Current Accounts: ${JSON.stringify(accounts)}
        Recent Transactions: ${JSON.stringify(transactions.slice(0, 10))}
        `,
      },
      contents: userMessage,
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini API Error (getFinancialAdvice):", error);
    return "I'm sorry, I encountered an error while processing your request.";
  }
}

export async function categorizeTransaction(description: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "Categorize the following bank transaction description into one of these categories: Food, Transport, Utilities, Entertainment, Shopping, Health, Income, Other. Return only the category name.",
      },
      contents: description,
    });

    return response.text?.trim() || "Other";
  } catch (error) {
    console.error("Gemini API Error (categorizeTransaction):", error);
    return "Other";
  }
}
