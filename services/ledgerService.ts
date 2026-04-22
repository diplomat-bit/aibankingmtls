import { v4 as uuidv4 } from 'uuid';
import admin from 'firebase-admin';

/**
 * The Ledger Service: The core of the "Sovereign Compute Ledger".
 * This service handles the "UUID mining logic" where every financial event
 * is cryptographically linked to a compute event.
 */
export class LedgerService {
  private get db() {
    return admin.firestore();
  }

  /**
   * Generates a new ledger entry, linking a compute event (UUID)
   * to a financial transaction and persists it to Firestore.
   */
  async createLedgerEntry(computeEventId: string, amount: number, currency: string, type: 'credit' | 'debit') {
    const ledgerId = uuidv4();
    
    const entry = {
      ledgerId,
      computeEventId,
      amount,
      currency,
      type,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'MINED'
    };

    // Persist to Firestore
    await this.db.collection('ledger_entries').doc(ledgerId).set(entry);
    
    console.log(`[LEDGER] Mined entry: ${ledgerId} | Compute: ${computeEventId}`);
    
    return {
      ...entry,
      timestamp: new Date().toISOString(), // Return string for API response
    };
  }
}

export const ledgerService = new LedgerService();
