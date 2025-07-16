import { describe } from "vitest";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { extractEvent } from "./utils/event";
import { COLLECTION_DEPOSIT } from "./utils/constants";

describe("NFTs pallet Collections", () => {
  test("create", async ({ api, signers }) => {
    const {alice, bob} = signers;

    const createCollectionTx = await api.tx.Nfts.create({
      admin: MultiAddress.Id(bob.address),
      config: {
        max_supply: 1000,
        mint_settings: {
          default_item_settings: 0n,
          mint_type: { type: "Issuer", value: undefined },
          price: 10n,
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
