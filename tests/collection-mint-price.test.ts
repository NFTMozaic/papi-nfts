import { Enum } from "polkadot-api";
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
        mint_type: Enum("Public"),
        price: MINT_PRICE,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).signAndSubmit(owner);

  const [createdEvent] = api.event.Nfts.Created.filter(createCollectionTx.events);
  const collectionId = createdEvent.collection;

  // 2. Non-issuer can mint by paying the price
  const mintNonIssuerTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(charlie.address),
    witness_data: { mint_price: MINT_PRICE },
  }).signAndSubmit(charlie);

  expect(mintNonIssuerTx.ok).toBe(true);
  const [transferEvent] = api.event.Balances.Transfer.filter(mintNonIssuerTx.events);

  expect(transferEvent.from).toBe(charlie.address);
  expect(transferEvent.to).toBe(owner.address);
  expect(transferEvent.amount).toBe(MINT_PRICE);
});
