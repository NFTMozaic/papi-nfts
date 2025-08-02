import { describe } from "vitest";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { Binary, Enum } from "polkadot-api";

describe("NFTs pallet Items", () => {
  test("mint", async ({ api, signers }) => {
    const {alice, bob} = signers;
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

    const [mintedEvent] = api.event.Nfts.Issued.filter(createItemTx.events);

    expect(mintedEvent.item).toBe(1);
    expect(mintedEvent.collection).toBe(collectionId);
  });

  test("burn", async ({ api, signers }) => {    
    const {alice, bob} = signers;

    const createCollectionTx = await api.tx.Nfts.create({
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
    }).signAndSubmit(alice);

    const [createdEvent] = api.event.Nfts.Created.filter(createCollectionTx.events);
    const collectionId = createdEvent.collection;
  
    const createItemTx = await api.tx.Nfts.mint({
      collection: collectionId,
      item: 1,
      mint_to: MultiAddress.Id(bob.address),
      witness_data: undefined,
    }).signAndSubmit(alice);

    const metadata = await api.tx.Nfts.set_metadata({
        collection: collectionId,
        item: 1,
        data: Binary.fromText("test"),
    }).signAndSubmit(alice);

    const attribute = await api.tx.Nfts.set_attribute({
        collection: collectionId,
        key: Binary.fromText("test"),
        value: Binary.fromText("test"),
        namespace: Enum("CollectionOwner"),
        maybe_item: 1,
    }).signAndSubmit(alice);

    const burnTx = await api.tx.Nfts.burn({
        collection: collectionId,
        item: 1,
    }).signAndSubmit(bob);
  })
});
