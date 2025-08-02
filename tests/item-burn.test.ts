import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { Enum } from "polkadot-api";

test("Item (NFT) burn", async ({ api, signers }) => {
  const { alice, bob } = signers;
  const mintPrice = 1n * 10n ** 10n; // 1 DOT

  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(alice.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: Enum("Issuer"),
        price: mintPrice,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).signAndSubmit(alice);

  const [createdEvent] = api.event.Nfts.Created.filter(createCollectionTx.events);
  const collectionId = createdEvent.collection;

  const createItemTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(bob.address),
    witness_data: {
      mint_price: mintPrice,
    },
  }).signAndSubmit(alice);

  expect(createItemTx.ok).toBe(true);

  // Item owner can burn the item
  const burnTx = await api.tx.Nfts.burn({
    collection: collectionId,
    item: 1,
  }).signAndSubmit(bob);

  expect(burnTx.ok).toBe(true);

  const item = await api.query.Nfts.Item.getValue(collectionId, 1);
  expect(item).toBeUndefined();
});

// bug: non transferrable items can be burned
// test("Item (NFT) cannot be burned if transfers are disabled", async ({}) => {});
