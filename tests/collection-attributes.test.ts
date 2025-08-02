import { Binary, Enum } from "polkadot-api";
import { extractEvent } from "./utils/event";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";

test(`Collection attributes can be set and unset`, async ({ api, signers }) => {
  const { alice: owner, bob: collectionAdmin } = signers;

  // Create collection with specific settings
  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(collectionAdmin.address),
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

  const setAttributeTx = await api.tx.Nfts.set_attribute({
    collection: collectionId,
    key: Binary.fromText("test"),
    value: Binary.fromText("test value"),
    namespace: Enum("CollectionOwner"),
    maybe_item: undefined,
  }).signAndSubmit(collectionAdmin);

  expect(setAttributeTx.ok).toBe(true);

  let collectionAttribute = await api.query.Nfts.Attribute.getValue(
    collectionId,
    undefined,
    Enum("CollectionOwner"),
    Binary.fromText("test"),
  );

  expect(collectionAttribute?.[0].asText()).toBe("test value");

  // Admin can unset attribute
  const unsetAttributeTx = await api.tx.Nfts.clear_attribute({
    collection: collectionId,
    key: Binary.fromText("test"),
    namespace: Enum("CollectionOwner"),
    maybe_item: undefined,
  }).signAndSubmit(collectionAdmin);

  expect(unsetAttributeTx.ok).toBe(true);

  collectionAttribute = await api.query.Nfts.Attribute.getValue(
    collectionId,
    undefined,
    Enum("CollectionOwner"),
    Binary.fromText("test"),
  );

  expect(collectionAttribute).toBeUndefined();
});
