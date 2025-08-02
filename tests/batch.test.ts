import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { Binary, Enum } from "polkadot-api";

test("Item (NFT) metadata", async ({ api, signers }) => {
  const { alice } = signers;

  // get the next collection id
  const nextCollectionId = await api.query.Nfts.NextCollectionId.getValue();
  if (!nextCollectionId) {
    throw new Error("No next collection id");
  }

  // Batch call #1: Create collection
  const createCollectionTx = api.tx.Nfts.create({
    admin: MultiAddress.Id(alice.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: Enum("Issuer"),
        price: undefined,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).decodedCall;

  // Batch call #2: Set collection metadata
  const setCollectionMetadataTx = api.tx.Nfts.set_collection_metadata({
    collection: nextCollectionId,
    data: Binary.fromText("https://example.com"),
  }).decodedCall;

  // Batch call #3: Set collection attribute
  const setCollectionAttributeTx = api.tx.Nfts.set_attribute({
    collection: nextCollectionId,
    key: Binary.fromText("https://example.com"),
    value: Binary.fromText("https://example.com"),
    namespace: Enum("CollectionOwner"),
    maybe_item: undefined,
  }).decodedCall;

  // All transactions should be successful in order or all of them will be reverted
  const batchTx = await api.tx.Utility.batch_all({
    calls: [
      createCollectionTx,
      setCollectionMetadataTx,
      setCollectionAttributeTx,
    ],
  }).signAndSubmit(alice);

  expect(batchTx.ok).toBe(true);

  // Alice is the owner of the collection
  const collection = await api.query.Nfts.Collection.getValue(nextCollectionId);
  expect(collection?.owner).toBe(alice.address);

  // Metadata is set
  const metadata = await api.query.Nfts.CollectionMetadataOf.getValue(nextCollectionId);
  expect(metadata?.data.asText()).toBe("https://example.com");

  // Attribute is set
  const attributes = await api.query.Nfts.Attribute.getEntries(nextCollectionId);
  expect(attributes.length).toBe(1);
});
