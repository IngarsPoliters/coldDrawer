1) Purpose & Vision

Goal: A peer-to-peer “asset wallet” that lets users mint, view, sell, and transfer real-world assets (cars, property, equipment) using on-chain, minimal metadata and BTC atomic swaps.
No uploads of PDFs/images; no platform fees (only network fees). Ownership = token possession. Proof of purchase = on-chain events linked to BTC HTLC.

One-line product pitch:

“Open your wallet and see your stuff.” A clean, tamper-evident inventory of assets with instant BTC ↔ asset swaps—no middlemen, no document uploads.

2) Core Principles

P2P only: Buyer and seller interact directly; no custodians.

No uploads: All public data = small structured fields on-chain.

Proof by events: Mint/transfer/escrow events are the receipt.

Atomicity: BTC payment and asset transfer succeed or refund together.

Simplicity: Minimal fields, clear UI states, predictable flows.

Portability: Standard wallets (BTC & EVM if cross-chain) interop.

Recoverability: Multisig/social recovery options.

3) Scope (MVP)

Wallet: Generate/import; show BTC, optional L2 balances.

Asset Registry (smart contract): 1 token = 1 asset (NFT-like).

Mint asset: Minimal on-chain fields (e.g., VIN, make, model).

Portfolio UI: Grid of asset cards; filter by category/status.

Details view: Ownership, on-chain fields, provenance timeline.

Sell flow: BTC price, deadline, HTLC hash H, lock both sides, atomic settlement.

Transfer/gift: Direct transfer to another address.

History: Event list with tx links.

Settings: Wallets, recovery, chain selection, privacy toggles.

Out of scope (MVP): fiat ramps, KYC, government registry integrations, legal templates, IPFS, messaging.

4) User Personas

Owner-seller: Wants to list an asset, get BTC, avoid fees.

Buyer: Wants immediate ownership after paying BTC.

Verifier (insurer/lender/buyer later): Checks chain events as proof.

5) Information Architecture

Top Bar: Wallet name, network status, balances (BTC, optional L2), quick actions.

Left Drawer: Portfolio (All), Vehicles, Property, Equipment, In Escrow, History, Settings.

Main Canvas (Portfolio Grid): Asset Cards.

Modal/Route Pages: Asset Details, Sell, Mint, Transfer, Wallet Connect, Recovery.

6) Key Screens & Components
6.1 Portfolio (Grid)

Card fields: Title, category icon (🚗/🏡/🧰), key identifiers (VIN/serial), Status pill (Owned | For Sale | In Escrow), Quick Actions (Sell, Transfer, Details).

Filters: Category, Status; Search by identifier.

Empty state: “No assets yet — Mint your first asset.”

6.2 Asset Details

Header: Title, Token ID, Network badge, Status pill.

Ownership: Current owner address, co-owners (if any).

On-chain fields (read-only): identifiers (VIN/serial/plate), attributes (make/model/year/color), optional public note.

Provenance Timeline: Mint → Transfer(s) → Sale Open → Sale Settle/Refund (each links to txid).

Actions: Sell for BTC, Gift/Transfer, Freeze metadata (optional), Add note (short on-chain text).

6.3 Sell Flow (BTC Atomic Swap)

Step 1: Set price (BTC), deadline (T).

Step 2: System generates secret S (buyer) and hash H = SHA256(S) OR accepts H from buyer QR.

Step 3: Display Buyer QR containing {H, price_btc, seller_receive_address, deadline}.

Step 4: Watcher monitors BTC chain for HTLC lock (amount, H, timeout).

Step 5: When BTC locked, app locks asset in sale-escrow with same H and buyer address.

Step 6: Claim: Seller reveals S on BTC to claim BTC → auto/assisted finalize transfer of asset to Buyer using S.

Step 7: Timeline updates with Sale Settle event.

Error/Timeout paths: If BTC not locked by deadline → cancel sale-escrow; if asset not claimed/settled by timeout → refunds according to respective HTLCs.

6.4 Mint Asset

Form: Category, Title, Identifiers (VIN/plate/serial), Attributes (make/model/year/color), optional public note.

Preview → Mint → Card appears as Owned.

6.5 Transfer/Gift

Input recipient address → Confirm → Event emitted → Ownership changes.

6.6 History

Table/list view of all events with filters; each row links to chain explorer.

6.7 Settings

Wallets: Create/import, hardware wallet connect, watch-only.

Recovery: Multisig config, social recovery guardians.

Chains: Bitcoin-only vs Cross-chain (e.g., Polygon).

Privacy: Toggle hide/show identifiers in UI (data remains on-chain).

Developer: Export event logs (JSON), toggle indexer endpoints.

7) Data Model (App Level)
type Asset = {
  tokenId: string;
  chainId: string;
  category: "vehicle" | "property" | "equipment" | "other";
  title: string;
  identifiers?: { vin?: string; plate?: string; serial?: string };
  attributes?: { make?: string; model?: string; year?: number; color?: string };
  status: "owned" | "for_sale" | "escrow";
  ownerAddress: string;
};

type Event = {
  type:
    | "mint"
    | "transfer"
    | "sale_open"
    | "sale_settle"
    | "sale_refund"
    | "freeze"
    | "note";
  tokenId: string;
  txid: string;
  timestamp: number;
  counterparty?: string;
  btc_txid?: string;
  hashH?: string; // hex
  note?: string;
};

8) Smart Contracts (High-Level)
8.1 Asset Registry (EVM-style NFT, minimal metadata)

Mint(tokenId, fields): only minter/self; store small fields (identifiers/attributes).

Transfer(from,to,tokenId): standard ERC-721 transfer semantics.

SetNote(tokenId, text): short on-chain note (e.g., <= 140 bytes).

FreezeMetadata(tokenId): optional immutability bit for fields.

EscrowSaleOpen(tokenId, buyer, hashH, expiryT): moves token into escrow.

EscrowClaim(tokenId, secretS): verifies SHA256(S) == H; transfers to buyer; emits SaleSettle.

EscrowRefund(tokenId): after expiry, returns to seller; emits SaleRefund.

Events: Minted, Transferred, NoteAdded, MetadataFrozen, SaleOpen(tokenId,buyer,H,expiry), SaleSettle(tokenId,buyer,btc_txid?), SaleRefund(tokenId).

Bitcoin-only path: Use Taproot/RGB/Taro-style assets with an analogous escrow primitive. This spec keeps EVM wording for clarity; adapt per chosen Bitcoin asset protocol.

9) BTC Atomic Swap (HTLC Pattern)

On Bitcoin (Buyer → Seller):

Create HTLC that pays Seller iff preimage S to hash H is revealed before time T_btc. Else refund to Buyer after T_btc.

On Asset Chain (Seller → Buyer):

Move asset to escrow requiring the same preimage S to claim to Buyer before T_asset. Else refund to Seller after T_asset.

Timing rules:

Set T_btc > T_asset (BTC refund window longer) to avoid griefing.

Atomicity emerges because revealing S on either chain enables the other party to claim on the other chain. Seller reveals S to take BTC → Buyer (or contract) uses S to claim asset.

10) States & Edge Cases

Owned → For Sale: when sale opened (H set, no BTC yet).

For Sale → In Escrow: BTC HTLC observed; asset escrowed with same H.

In Escrow → Settled: S revealed on BTC; asset claimed with S; events emitted.

In Escrow → Refunded: timeout reached; refunds to original owners.

Edge cases:

Buyer underpays BTC: ignore HTLC; show “mismatch” status.

Buyer sets wrong H: UI prevents; display “H mismatch.”

Expiry skew: enforce T_asset < T_btc with buffer (e.g., 2h).

Fee spikes: show fee estimates; allow manual bump (RBF).

Lost keys: encourage multisig/social recovery during onboarding.

11) UX Writing (microcopy)

Status pills: Owned / For Sale / In Escrow / Settled / Refunded.

Empty portfolio: “Nothing here yet. Mint your first asset.”

Sell intro: “Set a BTC price and a deadline. We’ll generate a sale code (H). The buyer locks BTC; you lock the asset; both settle together.”

Settlement success: “Sale settled. BTC received. Ownership transferred.”

Timeout: “Sale expired. Funds and asset returned.”

12) Visual System (MVP)

Theme: Dark UI, soft cards, rounded corners (lg/2xl), subtle shadows.

Icons: Category emoji or lucide icons (car/home/tools).

Color cues:

Green = Owned/Success

Blue = For Sale/Info

Amber = In Escrow/Warning

Red = Error/Expired

Typography: Inter/SF-like; 18–20px base, 28–32px headings.

Motion: Gentle fades/scale on modals; no parallax.

13) Accessibility

WCAG AA contrast; keyboard navigation; focus states; aria-labels on cards/actions; avoid color-only status signals (include text/pills).

14) Security & Privacy

Keys stay client-side; prefer hardware wallets.

Display and export PSBT for BTC; support watch-only.

On-chain data is public by design; allow UI privacy toggle to hide identifiers visually.

Rate-limit indexer API; verify tx inclusion via SPV/light client where possible.

Recovery: multisig or social guardians; clear warnings before irreversible actions (freeze, transfer).

15) Tech Stack (reference)

Frontend: React + Tailwind + shadcn/ui, Zustand/Redux for state.

Wallets:

BTC: PSBT, hardware (Ledger/Trezor), descriptor-based accounts.

EVM (if cross-chain): WalletConnect, ethers.js/viem.

Backend (optional): Lightweight indexer + websocket notifier; no custody.

Contracts: Asset Registry (EVM) or Bitcoin-asset protocol equivalent; HTLC library.

Explorers: Link to public explorers (BTC & asset chain).

16) API / Integration (internal)

GET /portfolio: list assets (from indexer events).

GET /asset/:id: details + timeline.

POST /mint: constructs tx data; signs client-side.

POST /sell/open: returns H, escrow params, QR payload.

WS /watch/btc_htlc: notify when HTLC seen/confirmed.

POST /sell/lock-asset: calls escrow open on-chain.

POST /sell/settle: submits claim with S (if manual).

All signing client-side; server never sees keys.

17) Telemetry (opt-in)

Anonymized counts: mints, sales opened, settlements, refunds.

No wallet addresses stored without consent.

18) Test Plan (MVP)

Unit: hash H validation, deadline math, state transitions.

Integration (testnet):

Happy path: BTC HTLC → asset escrow → claim → events.

Refund path(s): timeouts on either chain.

Mismatch: wrong H, underpayment, wrong amount.

UI: accessibility, keyboard-only flows.

Security: replay prevention, event ordering, fee bump/RBF handling.

19) Roadmap (Post-MVP)

Bitcoin-only asset issuance (Taproot assets/RGB) variant.

Co-ownership (fractional/multisig holding).

Offers/bids (buyer-initiated).

Private notes (encrypted, off-chain optional).

Government registry adapters (where legal frameworks allow).

Mobile app, push notifications.

20) Acceptance Criteria (MVP)

User can mint an asset with minimal fields and see it in Portfolio.

User can open a sale: set price, generate H, display Buyer QR.

System detects BTC HTLC, locks asset escrow with same H.

Seller reveals S on BTC; asset transfers to buyer automatically (or with one tap), events emitted on both sides.

History shows full chain of events with working tx links.

No document uploads anywhere in the flow.

21) Copy/Paste Prompts (for internal dev agents)

Design:

“Design a dark, card-based portfolio grid for tokenized assets with status pills (Owned/For Sale/In Escrow). Include Asset Details page with provenance timeline and primary actions (Sell, Transfer).”

Contract (EVM path):

“Implement an ERC-721-like Asset Registry with minimal metadata fields, note(), freeze(), and HTLC-style escrow (saleOpen, claim(secret), refund()). Emit SaleOpen/SaleSettle/SaleRefund events with hash H.”

BTC HTLC watcher:

“Build a service that watches for BTC HTLCs matching hash H and amount ≥ price. On confirm, trigger asset escrow open; on seller reveal of S, trigger asset claim.”