import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { extractEvent } from "./utils/event";

test("Item (NFT) transfer", async ({ api, signers }) => {
  const { alice, bob, charlie } = signers;

  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(alice.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: { type: "Issuer", value: undefined },
        price: undefined,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).signAndSubmit(alice);

  // nfts.Created event is emitted when the collection is created
  const nftsCreatedEvent = extractEvent(createCollectionTx, "Nfts", "Created");

  // collection id can be extracted from the event
  const collectionId = nftsCreatedEvent.collection as number;

  const createItemTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(bob.address),
    witness_data: undefined,
  }).signAndSubmit(alice);

  expect(createItemTx.ok).toBe(true);

  ///////////

  const transferTx = await api.tx.Nfts.transfer({
    collection: collectionId,
    item: 1,
    dest: MultiAddress.Id(charlie.address),
  }).signAndSubmit(bob);

  expect(transferTx.ok).toBe(true);

  const itemOwner = await api.query.Nfts.Item.getValue(collectionId, 1);
  expect(itemOwner?.owner).toBe(charlie.address);
});

test("Item (NFT) approved transfer", async ({ api, signers }) => {
  const { alice, bob, charlie, dave } = signers;

  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(alice.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: { type: "Issuer", value: undefined },
        price: undefined,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).signAndSubmit(alice);

  // nfts.Created event is emitted when the collection is created
  const nftsCreatedEvent = extractEvent(createCollectionTx, "Nfts", "Created");

  // collection id can be extracted from the event
  const collectionId = nftsCreatedEvent.collection as number;

  const createItemTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(bob.address),
    witness_data: undefined,
  }).signAndSubmit(alice);

  expect(createItemTx.ok).toBe(true);

  ///////////

  // Bob can approve one account to transfer the item
  const approveTransferTx = await api.tx.Nfts.approve_transfer({
    collection: collectionId,
    item: 1,
    delegate: MultiAddress.Id(charlie.address),
    maybe_deadline: undefined,
  }).signAndSubmit(bob);

  expect(approveTransferTx.ok).toBe(true);

  // Many accounts can be approved to transfer the item
  const approveTransferTx2 = await api.tx.Nfts.approve_transfer({
    collection: collectionId,
    item: 1,
    delegate: MultiAddress.Id(dave.address),
    maybe_deadline: undefined,
  }).signAndSubmit(bob);

  expect(approveTransferTx2.ok).toBe(true);

  // Query the approvals
  const item = await api.query.Nfts.Item.getValue(collectionId, 1);
  expect(item?.approvals.length).toBe(2);

  // Charlie can transfer the item to Dave
  const approvedTransferTx = await api.tx.Nfts.transfer({
    collection: collectionId,
    item: 1,
    dest: MultiAddress.Id(dave.address),
  }).signAndSubmit(charlie);

  expect(approvedTransferTx.ok).toBe(true);

  // Dave is the new owner
  const itemOwner = await api.query.Nfts.Item.getValue(collectionId, 1);
  expect(itemOwner?.owner).toBe(dave.address);

  // all approvals are removed
  const item2 = await api.query.Nfts.Item.getValue(collectionId, 1);
  expect(item2?.approvals.length).toBe(0);
});

test("Item (NFT) transfer approval can be cancelled", async ({ api, signers }) => {
  const { alice, bob, charlie, dave } = signers;

  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(alice.address),
    config: {
      max_supply: 1000,
      mint_settings: {
        default_item_settings: 0n,
        mint_type: { type: "Issuer", value: undefined },
        price: undefined,
        start_block: undefined,
        end_block: undefined,
      },
      settings: 0n,
    },
  }).signAndSubmit(alice);

  // nfts.Created event is emitted when the collection is created
  const nftsCreatedEvent = extractEvent(createCollectionTx, "Nfts", "Created");

  // collection id can be extracted from the event
  const collectionId = nftsCreatedEvent.collection as number;

  const createItemTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(bob.address),
    witness_data: undefined,
  }).signAndSubmit(alice);

  expect(createItemTx.ok).toBe(true);

  ///////////

  // Bob approves several accounts to transfer the item
  const approveTransferTx = await api.tx.Nfts.approve_transfer({
    collection: collectionId,
    item: 1,
    delegate: MultiAddress.Id(charlie.address),
    maybe_deadline: undefined,
  }).signAndSubmit(bob);

  expect(approveTransferTx.ok).toBe(true);

  const approveTransferTx2 = await api.tx.Nfts.approve_transfer({
    collection: collectionId,
    item: 1,
    delegate: MultiAddress.Id(dave.address),
    maybe_deadline: undefined,
  }).signAndSubmit(bob);

  expect(approveTransferTx2.ok).toBe(true);

  // Bob can cancel the approval
  const cancelApprovalTx = await api.tx.Nfts.cancel_approval({
    collection: collectionId,
    item: 1,
    delegate: MultiAddress.Id(charlie.address),
  }).signAndSubmit(bob);

  expect(cancelApprovalTx.ok).toBe(true);

  let item = await api.query.Nfts.Item.getValue(collectionId, 1);
  expect(item?.approvals.length).toBe(1);

  // Bob can cancel all approvals
  const clearAllApprovalsTx = await api.tx.Nfts.clear_all_transfer_approvals({
    collection: collectionId,
    item: 1,
  }).signAndSubmit(bob);

  expect(clearAllApprovalsTx.ok).toBe(true);

  item = await api.query.Nfts.Item.getValue(collectionId, 1);
  expect(item?.approvals.length).toBe(0);
})