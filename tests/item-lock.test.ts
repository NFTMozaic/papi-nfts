import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { extractEvent } from "./utils/event";
import { Enum } from "polkadot-api";

test("Item (NFT) lock", async ({ api, signers }) => {
  const { alice, bob: admin, charlie: freezer } = signers;

  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(admin.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: Enum("Issuer"),
        price: undefined,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 1n,
    },
  }).signAndSubmit(alice);

  // nfts.Created event is emitted when the collection is created
  const nftsCreatedEvent = extractEvent(createCollectionTx, "Nfts", "Created");

  // collection id can be extracted from the event
  const collectionId = nftsCreatedEvent.collection as number;

  // Create item to alice
  const createItemTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(alice.address),
    witness_data: undefined,
  }).signAndSubmit(admin);

  expect(createItemTx.ok).toBe(true);

  // Set freezer
  const teamTx = await api.tx.Nfts.set_team({
    collection: collectionId,
    admin: MultiAddress.Id(admin.address),
    freezer: MultiAddress.Id(freezer.address),
    issuer: MultiAddress.Id(admin.address)
  }).signAndSubmit(alice);

  expect(teamTx.ok).toBe(true);

  // Default item mint_settings is 0n
  let itemSettings = await api.query.Nfts.ItemConfigOf.getValue(collectionId, 1);
  expect(itemSettings).toBe(0n);

  // 1. Admin can lock metadata and attributes
  const lockMetadataTx = await api.tx.Nfts.lock_item_properties({
    collection: collectionId,
    item: 1,
    lock_metadata: true,
    lock_attributes: true,
  }).signAndSubmit(admin);

  expect(lockMetadataTx.ok).toBe(true);

  // Item mint_settings is 6n
  itemSettings = await api.query.Nfts.ItemConfigOf.getValue(collectionId, 1);
  expect(itemSettings).toBe(6n);

  // 2. Admin cannot unlock metadata and/or attributes – they are permanently locked
  const unlockMetadataTx = await api.tx.Nfts.lock_item_properties({
    collection: collectionId,
    item: 1,
    lock_metadata: true,
    lock_attributes: false,
  }).signAndSubmit(admin);

  // I believe this should fail, but it doesn't
  // however, the item remains locked
  expect(unlockMetadataTx.ok).toBe(true);

  // Item mint_settings remains 6n
  itemSettings = await api.query.Nfts.ItemConfigOf.getValue(collectionId, 1);
  expect(itemSettings).toBe(6n);

  // 3. Freezer can lock transfers
  const lockTransfersTx = await api.tx.Nfts.lock_item_transfer({
    collection: collectionId,
    item: 1,
  }).signAndSubmit(freezer);

  expect(lockTransfersTx.ok).toBe(true);

  // Item mint_settings is 7n (transfers are locked)
  itemSettings = await api.query.Nfts.ItemConfigOf.getValue(collectionId, 1);
  expect(itemSettings).toBe(7n);

  // 4. Freezer can unlock transfers
  const unlockTransfersTx = await api.tx.Nfts.unlock_item_transfer({
    collection: collectionId,
    item: 1,
  }).signAndSubmit(freezer);

  expect(unlockTransfersTx.ok).toBe(true);

  // Item mint_settings is 6n (transfers unlocked)
  itemSettings = await api.query.Nfts.ItemConfigOf.getValue(collectionId, 1);
  expect(itemSettings).toBe(6n);

});
