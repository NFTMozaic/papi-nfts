import { Binary } from "polkadot-api";
import { extractEvent } from "./utils/event";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";

test(`Collection metadata can be set and unset`, async ({ api, signers }) => {
  const { alice: owner, bob: collectionAdmin } = signers;

  // Create collection with specific settings
  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(collectionAdmin.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: { type: "Public", value: undefined },
        price: undefined,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).signAndSubmit(owner);

  const nftsCreatedEvent = extractEvent(createCollectionTx, "Nfts", "Created");

  const collectionId = nftsCreatedEvent.collection as number;

  const metadata = "https://some-external-storage.com/metadata.json";

  const setMetadataTx = await api.tx.Nfts.set_collection_metadata({
    collection: collectionId,
    data: Binary.fromText(metadata),
  }).signAndSubmit(collectionAdmin);

  expect(setMetadataTx.ok).toBe(true);

  let collectionMetadata = await api.query.Nfts.CollectionMetadataOf.getValue(
    collectionId
  );

  expect(collectionMetadata?.data.asText()).toBe(metadata);

  const clearMetadataTx = await api.tx.Nfts.clear_collection_metadata({
    collection: collectionId,
  }).signAndSubmit(collectionAdmin);

  expect(clearMetadataTx.ok).toBe(true);

  collectionMetadata = await api.query.Nfts.CollectionMetadataOf.getValue(
    collectionId
  );

  expect(collectionMetadata?.data.asText()).toBe(undefined);
});
