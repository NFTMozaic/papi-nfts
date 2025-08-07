import { describe } from "vitest";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { COLLECTION_DEPOSIT } from "./utils/constants";
import { Enum } from "polkadot-api";

describe("NFTs pallet Collections", () => {
  test("account can create collection and query owned collections", async ({ api, signers }) => {
    const {alice, bob} = signers;

    const createCollectionTx = await api.tx.Nfts.create({
      admin: MultiAddress.Id(bob.address),
      config: {
        max_supply: 1000,
        mint_settings: {
          default_item_settings: 0n,
          mint_type: Enum("Issuer"),
          price: 1n * 10n ** 10n, // 1 DOT
          start_block: undefined,
          end_block: undefined,
        },
        settings: 0n,
      },
    }).signAndSubmit(alice);

    const createCollectionT2x = await api.tx.Nfts.create({
      admin: MultiAddress.Id(bob.address),
      config: {
        max_supply: 1000,
        mint_settings: {
          default_item_settings: 0n,
          mint_type: Enum("Issuer"),
          price: 1n * 10n ** 10n, // 1 DOT
          start_block: undefined,
          end_block: undefined,
        },
        settings: 0n,
      },
    }).signAndSubmit(alice);

    // nfts.Created event is emitted when the collection is created
    const [createdEvent] = api.event.Nfts.Created.filter(createCollectionTx.events);
    const collectionId = createdEvent.collection;
  
    const collectionInfo = await api.query.Nfts.Collection.getValue(collectionId);
    expect(collectionInfo?.owner).toBe(alice.address);
    expect(collectionInfo?.owner_deposit).toBe(COLLECTION_DEPOSIT);

    // Can query account collections
    const ownedCollections = await api.query.Nfts.CollectionAccount.getEntries(alice.address);
    const collectionIds = ownedCollections.map(c => c.keyArgs[1]);
    expect(collectionIds).contain(collectionId)
  });
});
