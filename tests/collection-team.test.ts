import { describe } from "vitest";
import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { extractEvent } from "./utils/event";
import { COLLECTION_DEPOSIT } from "./utils/constants";

describe("Collection Team", () => {
  test("Owner and admin are set during creation", async ({ api, signers }) => {
    const { alice, bob } = signers;

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

    const bobRole = await api.query.Nfts.CollectionRoleOf.getValue(
      collectionId,
      bob.address
    );
    expect(bobRole).toBe(7); // (111) the collection admin also receives the freezer and issuer roles
  });

  test("Owner can set team members", async ({ api, signers }) => {
    const { alice, bob, charlie, dave, eve } = signers;

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

    const setTeamTx = await api.tx.Nfts.set_team({
      collection: collectionId,
      admin: MultiAddress.Id(charlie.address),
      issuer: MultiAddress.Id(dave.address),
      freezer: MultiAddress.Id(eve.address),
    }).signAndSubmit(alice);

    const daveRole = await api.query.Nfts.CollectionRoleOf.getValue(
      collectionId,
      dave.address
    );
    expect(daveRole).toBe(1); // (001) the collection issuer

    const eveRole = await api.query.Nfts.CollectionRoleOf.getValue(
      collectionId,
      eve.address
    );
    expect(eveRole).toBe(2); // (010) the collection freezer

    const charlieRole = await api.query.Nfts.CollectionRoleOf.getValue(
      collectionId,
      charlie.address
    );
    expect(charlieRole).toBe(4); // (100) the collection admin

    const bobRole = await api.query.Nfts.CollectionRoleOf.getValue(
      collectionId,
      bob.address
    );
    expect(bobRole).toBe(undefined); // bob is not a team member anymore
  });

  test("The ownership can be transferred", async ({ api, signers }) => {
    const { alice, bob, charlie, dave, eve } = signers;

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

    const receiveTx = await api.tx.Nfts.set_accept_ownership({
      maybe_collection: collectionId,
    }).signAndSubmit(charlie);
    expect(receiveTx.ok).toBe(true);

    const transferTx = await api.tx.Nfts.transfer_ownership({
      collection: collectionId,
      new_owner: MultiAddress.Id(charlie.address),
    }).signAndSubmit(alice);
    expect(transferTx.ok).toBe(true);

    const collectionConfig = await api.query.Nfts.Collection.getValue(
      collectionId
    );
    expect(collectionConfig?.owner).toBe(charlie.address);
  });
});
