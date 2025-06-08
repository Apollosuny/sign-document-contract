import { PublicKey } from '@solana/web3.js';
import * as crypto from 'crypto';

/**
 * Utility functions for the sign document contract
 */
export class ContractUtils {
  /**
   * Generate a SHA-256 hash from form data
   * @param data - The form data to hash
   * @returns The SHA-256 hash as a Buffer
   */
  static generateFormHash(data: string | object): Buffer {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest();
  }

  /**
   * Derive the admin config PDA
   * @param programId - The program ID
   * @returns [PDA, bump]
   */
  static deriveAdminConfigPda(programId: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('admin_config')],
      programId
    );
  }

  /**
   * Derive the form approval PDA
   * @param formId - The form ID
   * @param programId - The program ID
   * @returns [PDA, bump]
   */
  static deriveFormApprovalPda(
    formId: string,
    programId: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('form_approval'), Buffer.from(formId)],
      programId
    );
  }

  /**
   * Wait for a specified amount of time
   * @param ms - Milliseconds to wait
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a random form ID for testing
   * @param prefix - Optional prefix for the form ID
   * @returns A random form ID
   */
  static generateRandomFormId(prefix: string = 'form'): string {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${randomSuffix}`;
  }

  /**
   * Convert a Solana timestamp to a JavaScript Date
   * @param timestamp - Solana timestamp (i64)
   * @returns JavaScript Date object
   */
  static timestampToDate(timestamp: number): Date {
    return new Date(timestamp * 1000);
  }

  /**
   * Validate form hash format
   * @param hash - The hash to validate
   * @returns True if valid, false otherwise
   */
  static isValidFormHash(hash: Buffer | Uint8Array | number[]): boolean {
    if (!hash) return false;

    const hashArray = Array.from(hash);

    // Check if it's 32 bytes long
    if (hashArray.length !== 32) return false;

    // Check if it's not all zeros
    return hashArray.some((byte) => byte !== 0);
  }

  /**
   * Format a public key for display
   * @param pubkey - The public key to format
   * @returns Formatted string
   */
  static formatPublicKey(pubkey: PublicKey): string {
    const str = pubkey.toString();
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  }
}
