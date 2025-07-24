import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { extractEvent } from "./utils/event";
import { Binary } from "polkadot-api";

test("Item (NFT) attributes", async ({ api, signers }) => {
  const { alice, bob } = signers;
  const mintPrice = 1n * 10n ** 10n; // 1 DOT

  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(alice.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: { type: "Issuer", value: undefined },
        price: mintPrice,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).signAndSubmit(alice);

  // nfts.Created event is emitted when the collection is created
  const nftsCreatedEvent = extractEvent(createCollectionTx, "Nfts", "Created");

  // collection id can be extracted from the event
  const collectionId = nftsCreatedEvent.collection as number;

  const createItemTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(bob.address),
    witness_data: {
      mint_price: mintPrice,
    },
  }).signAndSubmit(alice);

  expect(createItemTx.ok).toBe(true);

  const setAttributeTx = await api.tx.Nfts.set_attribute({
    collection: collectionId,
    maybe_item: 1, 
    namespace: {type: "CollectionOwner", value: undefined},
    key: Binary.fromText("Experience"),
    value: Binary.fromText("300"),   
  }).signAndSubmit(alice);

  expect(setAttributeTx.ok).toBe(true);

  const setAttributeTx2 = await api.tx.Nfts.set_attribute({
    collection: collectionId,
    maybe_item: 1, 
    namespace: {type: "ItemOwner", value: undefined},
    key: Binary.fromText("Experience"),
    value: Binary.fromText("300"),   
  }).signAndSubmit(bob);

  expect(setAttributeTx2.ok).toBe(true);

  /// getting attributes
  const attributes = await api.query.Nfts.Attribute.getEntries(collectionId, 1);
  const attribute = await api.query.Nfts.Attribute.getValue(collectionId, 1, {type: "CollectionOwner", value: undefined}, Binary.fromText("Experience"));

  const clearAttributeTx = await api.tx.Nfts.clear_attribute({
    collection: collectionId,
    maybe_item: 1,
    key: Binary.fromText("Experience"),
    namespace: {type: "CollectionOwner", value: undefined},
  }).signAndSubmit(alice);

  expect(clearAttributeTx.ok).toBe(true);

  const clearAttributeTx2 = await api.tx.Nfts.clear_attribute({
    collection: collectionId,
    maybe_item: 1,
    key: Binary.fromText("Experience"),
    namespace: {type: "ItemOwner", value: undefined},
  }).signAndSubmit(bob);

  expect(clearAttributeTx2.ok).toBe(true);
});
