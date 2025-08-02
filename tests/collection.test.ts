import { describe } from "vitest";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { extractEvent } from "./utils/event";
import { COLLECTION_DEPOSIT } from "./utils/constants";
import { Enum } from "polkadot-api";

describe("NFTs pallet Collections", () => {
  test("create", async ({ api, signers }) => {
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

    // nfts.Created event is emitted when the collection is created
    const nftsCreatedEvent = extractEvent(
      createCollectionTx,
      "Nfts",
      "Created"
    );

    // collection id can be extracted from the event
    const collectionId = nftsCreatedEvent.collection as number;

    const collectionInfo = await api.query.Nfts.Collection.getValue(collectionId);
    expect(collectionInfo?.owner).toBe(alice.address);
    expect(collectionInfo?.owner_deposit).toBe(COLLECTION_DEPOSIT);
  });
});
