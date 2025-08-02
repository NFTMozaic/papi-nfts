import { Binary, Enum } from "polkadot-api";
import { extractEvent } from "./utils/event";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";

test(`Collection can be destroyed`, async ({ api, signers }) => {
  const { alice: owner } = signers;

  // Create collection with specific settings
  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(owner.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: Enum("Public"),
        price: undefined,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).signAndSubmit(owner);

  const nftsCreatedEvent = extractEvent(createCollectionTx, "Nfts", "Created");

  const collectionId = nftsCreatedEvent.collection as number;

  const setattr = await api.tx.Nfts.set_attribute({
    collection: collectionId,
    key: Binary.fromText("test"),
    value: Binary.fromText("test value"),
    namespace: Enum("CollectionOwner"),
    maybe_item: undefined,
  }).signAndSubmit(owner);

  const witness = await api.query.Nfts.Collection.getValue(collectionId);

  const destroyCollectionTx = await api.tx.Nfts.destroy({
    collection: collectionId,
    witness: {
      attributes: witness?.attributes ?? 0,
      item_configs: witness?.item_configs ?? 0,
      item_metadatas: witness?.item_metadatas ?? 0, 
    },
  }).signAndSubmit(owner);

  expect(destroyCollectionTx.ok).toBe(true);
});
