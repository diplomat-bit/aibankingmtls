import { Transaction, Account } from "../types";

export async function getFinancialAdvice(
  userMessage: string,
  transactions: Transaction[],
  accounts: Account[]
) {
  try {
    const response = await fetch('/api/gemini/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, transactions, accounts })
    });
    const data = await response.json();
    return data.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini Proxy Error (getFinancialAdvice):", error);
    return "I'm sorry, I encountered an error while processing your request.";
  }
}

export async function categorizeTransaction(description: string) {
  try {
    const response = await fetch('/api/gemini/categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    });
    const data = await response.json();
    return data.category || "Other";
  } catch (error) {
    console.error("Gemini Proxy Error (categorizeTransaction):", error);
    return "Other";
  }
}
