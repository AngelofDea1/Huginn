/**
 * activate-txline.mjs
 *
 * Run once to get your TXLINE_JWT and TXLINE_API_KEY.
 *
 * Usage:
 *   node activate-txline.mjs
 *
 * Optional: use an existing keypair file
 *   node activate-txline.mjs --keypair ~/.config/solana/id.json
 *
 * Requires tiny SOL balance for tx fees (~0.000005 SOL = fractions of a cent).
 * The World Cup free tier costs 0 TxL tokens.
 */

import axios from 'axios';
import nacl from 'tweetnacl';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- Config ------------------------------------------------------------------

const MAINNET_RPC      = 'https://api.mainnet-beta.solana.com';
const PROGRAM_ID       = new PublicKey('9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA');
const TXL_TOKEN_MINT   = new PublicKey('Zhw9TVKp68a1QrftncMSd6ELXKDtpVMNuMGr1jNwdeL');
const TXLINE_API       = 'https://txline.txodds.com';

// Free tier - choose one:
//   1  = World Cup + Int Friendlies (60-second delay)
//   12 = World Cup + Int Friendlies (real-time)
const SERVICE_LEVEL_ID = 12;
const DURATION_WEEKS   = 4;     // 4 weeks minimum, free

// ---- IDL (subscribe instruction only) ----------------------------------------
// Minimal IDL extracted from TxLINE mainnet docs
const IDL = {
  address: '9ExbZjAapQww1vfcisDmrngPinHTEfpjYRWMunJgcKaA',
  metadata: { name: 'txoracle', version: '1.5.2', spec: '0.1.0' },
  instructions: [
    {
      name: 'subscribe',
      discriminator: [254, 28, 191, 138, 156, 179, 183, 53],
      accounts: [
        { name: 'user',                   writable: true,  signer: true  },
        { name: 'pricingMatrix'                                           },
        { name: 'tokenMint'                                               },
        { name: 'userTokenAccount',       writable: true                 },
        { name: 'tokenTreasuryVault',     writable: true                 },
        { name: 'tokenTreasuryPda'                                        },
        { name: 'tokenProgram'                                            },
        { name: 'systemProgram'                                           },
        { name: 'associatedTokenProgram'                                  },
      ],
      args: [
        { name: 'serviceLevelId', type: 'u16' },
        { name: 'weeks',          type: 'u8'  },
      ],
    },
  ],
  types: [],
  accounts: [],
  errors: [],
  events: [],
};

// ---- Helpers -----------------------------------------------------------------

function loadOrCreateKeypair(keypairPath) {
  if (keypairPath && fs.existsSync(keypairPath)) {
    const raw = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const kp  = Keypair.fromSecretKey(Uint8Array.from(raw));
    console.log('Loaded keypair:', kp.publicKey.toBase58());
    return kp;
  }

  const kp = Keypair.generate();
  const savePath = path.join(__dirname, 'txline-keypair.json');
  fs.writeFileSync(savePath, JSON.stringify(Array.from(kp.secretKey)));
  console.log('Generated new keypair:', kp.publicKey.toBase58());
  console.log('Keypair saved to:', savePath);
  return kp;
}

async function waitForBalance(connection, pubkey, minLamports = 1_000_000) {
  const start = Date.now();
  const timeout = 120_000; // 2 minutes
  while (Date.now() - start < timeout) {
    const bal = await connection.getBalance(pubkey);
    if (bal >= minLamports) {
      console.log(`Balance confirmed: ${bal / 1e9} SOL`);
      return bal;
    }
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error(`Wallet still has no SOL after 2 minutes. Fund ${pubkey.toBase58()} and re-run.`);
}

async function getGuestJwt() {
  console.log('\nStep 1: Getting guest JWT...');
  const { data } = await axios.post(`${TXLINE_API}/auth/guest/start`);
  const jwt = data.token;
  console.log('JWT obtained (first 40 chars):', jwt.slice(0, 40) + '...');
  return jwt;
}

async function subscribeOnChain(connection, wallet, program) {
  console.log('\nStep 2: Subscribing on-chain (free tier, 0 tokens)...');

  // Derive PDAs
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_treasury_v2')],
    PROGRAM_ID
  );

  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    TXL_TOKEN_MINT,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  const [pricingMatrixPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pricing_matrix')],
    PROGRAM_ID
  );

  // Get or create user token account (needed by the contract even though 0 tokens transfer)
  console.log('Creating user token account if needed...');
  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet.payer,
    TXL_TOKEN_MINT,
    wallet.publicKey,
    false,
    'confirmed',
    {},
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log(`Subscribing: Service Level ${SERVICE_LEVEL_ID}, ${DURATION_WEEKS} weeks...`);

  const txSig = await program.methods
    .subscribe(SERVICE_LEVEL_ID, DURATION_WEEKS)
    .accounts({
      user:                   wallet.publicKey,
      pricingMatrix:          pricingMatrixPda,
      tokenMint:              TXL_TOKEN_MINT,
      userTokenAccount:       userTokenAccount.address,
      tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram:           TOKEN_2022_PROGRAM_ID,
      systemProgram:          SystemProgram.programId,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log('On-chain subscription confirmed!');
  console.log('Transaction signature:', txSig);
  return txSig;
}

async function activateApiToken(txSig, jwt, wallet) {
  console.log('\nStep 3: Activating API token...');

  const SELECTED_LEAGUES = []; // empty = standard bundle (World Cup free tier)
  const messageString = `${txSig}:${SELECTED_LEAGUES.join(',')}:${jwt}`;
  const message = new TextEncoder().encode(messageString);

  const signatureBytes = nacl.sign.detached(message, wallet.payer.secretKey);
  const walletSignature = Buffer.from(signatureBytes).toString('base64');

  const { data } = await axios.post(
    `${TXLINE_API}/api/token/activate`,
    {
      txSig,
      walletSignature,
      leagues: SELECTED_LEAGUES,
    },
    {
      headers: { Authorization: `Bearer ${jwt}` },
    }
  );

  const apiToken = data.token || data;
  console.log('API token activated!');
  return apiToken;
}

// ---- Main --------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const keypairFlagIdx = args.indexOf('--keypair');
  const keypairPath = keypairFlagIdx !== -1 ? args[keypairFlagIdx + 1] : null;

  console.log('TxLINE Free Tier Activation Script');
  console.log('Service Level:', SERVICE_LEVEL_ID === 1 ? '1 (World Cup, 60s delay)' : '12 (World Cup, real-time)');
  console.log('=========================================');

  const connection = new Connection(MAINNET_RPC, 'confirmed');
  const keypair = loadOrCreateKeypair(keypairPath);

  // Wait for balance if this is a brand new keypair
  const balance = await connection.getBalance(keypair.publicKey);
  if (balance < 1_000_000) {
    console.log(`\nWallet ${keypair.publicKey.toBase58()} needs SOL.`);
    console.log('Send at least 0.002 SOL to this address, then wait...');
    await waitForBalance(connection, keypair.publicKey);
  } else {
    console.log(`Wallet balance: ${(balance / 1e9).toFixed(4)} SOL - OK`);
  }

  // Set up Anchor
  const nodeWallet = new anchor.Wallet(keypair);
  const provider = new anchor.AnchorProvider(connection, nodeWallet, {
    commitment: 'confirmed',
  });
  anchor.setProvider(provider);

  const program = new anchor.Program(IDL, provider);

  // Execute the 3-step flow
  const jwt      = await getGuestJwt();
  const txSig    = await subscribeOnChain(connection, nodeWallet, program);
  const apiToken = await activateApiToken(txSig, jwt, nodeWallet);

  // Output
  console.log('\n=========================================');
  console.log('SUCCESS - paste these into your .env:');
  console.log('=========================================\n');
  console.log(`TXLINE_JWT=${jwt}`);
  console.log(`TXLINE_API_KEY=${apiToken}`);
  console.log(`TXLINE_BASE_URL=https://txline.txodds.com/api`);
  console.log('\nDone. Delete txline-keypair.json after you have saved your tokens.\n');
}

main().catch(err => {
  console.error('\nFailed:', err.message);
  if (err.response?.data) {
    console.error('API error:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
