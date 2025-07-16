import { extractEvent } from "./utils/event";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";

test(`Mint Price can be set`, async ({ api, signers }) => {
  const { alice: owner, bob: issuer, charlie, dave } = signers;
  const MINT_PRICE = 100n;

  // Create collection with specific settings
  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(owner.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: { type: "Public", value: undefined },
        price: MINT_PRICE,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).signAndSubmit(owner);

  const nftsCreatedEvent = extractEvent(createCollectionTx, "Nfts", "Created");

  const collectionId = nftsCreatedEvent.collection as number;

  // 2. Non-issuer can mint by paying the price
  const mintNonIssuerTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(charlie.address),
    witness_data: { mint_price: MINT_PRICE },
  }).signAndSubmit(charlie);

  expect(mintNonIssuerTx.ok).toBe(true);
  const transferEvent = extractEvent(mintNonIssuerTx, "Balances", "Transfer");

  expect(transferEvent.from).toBe(charlie.address);
  expect(transferEvent.to).toBe(owner.address);
  expect(transferEvent.amount).toBe(MINT_PRICE);
});
