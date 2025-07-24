import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { extractEvent } from "./utils/event";
import { Binary } from "polkadot-api";

test("Item (NFT) metadata", async ({ api, signers }) => {
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

  const setMetadataTx = await api.tx.Nfts.set_metadata({
    collection: collectionId,
    data: Binary.fromText("https://example.com"),
    item: 1,
  }).signAndSubmit(alice);

  expect(setMetadataTx.ok).toBe(true);

  const metadata = await api.query.Nfts.ItemMetadataOf.getValue(collectionId, 1);
  expect(metadata?.data.asText()).toBe("https://example.com");

  const clearMetadataTx = await api.tx.Nfts.clear_metadata({
    collection: collectionId,
    item: 1,
  }).signAndSubmit(alice);

  expect(clearMetadataTx.ok).toBe(true);
});
