import * as bitcoin from 'bitcoinjs-lib';
import { HTLCParams } from '@coldDrawer/shared';

export interface BitcoinTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: Array<{
    txid: string;
    vout: number;
    scriptSig: {
      asm: string;
      hex: string;
    };
    witness?: string[];
    sequence: number;
  }>;
  vout: Array<{
    value: number;
    n: number;
    scriptPubKey: {
      asm: string;
      hex: string;
      type: string;
      address?: string;
    };
  }>;
  blocktime?: number;
  confirmations?: number;
}

export function createHTLCScript(
  hashH: string,
  receiverPubKey: Buffer,
  senderPubKey: Buffer,
  locktime: number
): Buffer {
  // OP_IF
  //   OP_SHA256 <hash> OP_EQUALVERIFY OP_DUP OP_HASH160 <receiver_pubkey_hash>
  // OP_ELSE
  //   <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP OP_DUP OP_HASH160 <sender_pubkey_hash>
  // OP_ENDIF
  // OP_EQUALVERIFY OP_CHECKSIG

  const hashBuffer = Buffer.from(hashH, 'hex');
  const receiverHash = bitcoin.crypto.hash160(receiverPubKey);
  const senderHash = bitcoin.crypto.hash160(senderPubKey);
  const locktimeBuffer = bitcoin.script.number.encode(locktime);

  return bitcoin.script.compile([
    bitcoin.opcodes.OP_IF,
      bitcoin.opcodes.OP_SHA256,
      hashBuffer,
      bitcoin.opcodes.OP_EQUALVERIFY,
      bitcoin.opcodes.OP_DUP,
      bitcoin.opcodes.OP_HASH160,
      receiverHash,
    bitcoin.opcodes.OP_ELSE,
      locktimeBuffer,
      bitcoin.opcodes.OP_CHECKLOCKTIMEVERIFY,
      bitcoin.opcodes.OP_DROP,
      bitcoin.opcodes.OP_DUP,
      bitcoin.opcodes.OP_HASH160,
      senderHash,
    bitcoin.opcodes.OP_ENDIF,
    bitcoin.opcodes.OP_EQUALVERIFY,
    bitcoin.opcodes.OP_CHECKSIG
  ]);
}

export function extractSecretFromWitness(witness: string[]): string | null {
  // In a typical HTLC claim, the witness stack includes:
  // [signature, preimage, redeemScript] for the success path
  if (witness.length >= 2) {
    const preimage = witness[1];
    // Validate it's a 32-byte hex string (64 characters)
    if (preimage && preimage.length === 64 && /^[a-fA-F0-9]+$/.test(preimage)) {
      return preimage;
    }
  }
  return null;
}

export function validateHTLCTransaction(
  tx: BitcoinTransaction,
  htlcParams: HTLCParams
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Find output that matches the expected value and script pattern
  const htlcOutput = tx.vout.find(output => {
    const valueSatoshis = Math.round(output.value * 100000000);
    return valueSatoshis >= parseInt(htlcParams.amount);
  });

  if (!htlcOutput) {
    errors.push(`No output found with value >= ${htlcParams.amount} satoshis`);
  }

  // Check if this is a P2WSH (witness script hash) output
  if (htlcOutput && htlcOutput.scriptPubKey.type !== 'witness_v0_scripthash') {
    errors.push('Expected P2WSH output for HTLC');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function isHTLCSpendTransaction(tx: BitcoinTransaction): boolean {
  // Check if any input has witness data (indicating P2WSH spending)
  return tx.vin.some(input => input.witness && input.witness.length > 0);
}

export async function fetchTransaction(txid: string, apiUrl: string): Promise<BitcoinTransaction | null> {
  try {
    const response = await fetch(`${apiUrl}/tx/${txid}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch transaction ${txid}:`, error);
    return null;
  }
}

export async function fetchAddress(address: string, apiUrl: string): Promise<any> {
  try {
    const response = await fetch(`${apiUrl}/address/${address}/txs`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch address ${address}:`, error);
    return null;
  }
}

export function formatBTCAmount(satoshis: string | number): string {
  const sats = typeof satoshis === 'string' ? parseInt(satoshis) : satoshis;
  return (sats / 100000000).toFixed(8) + ' BTC';
}