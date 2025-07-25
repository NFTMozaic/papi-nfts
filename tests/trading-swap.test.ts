import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { extractEvent } from "./utils/event";

test("Items (NFT) can be swapped", async ({ api, signers }) => {
  const { alice, bob } = signers;

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
  const collectionIdBob = nftsCreatedEvent.collection as number;

  const createCollectionTx2 = await api.tx.Nfts.create({
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
  const nftsCreatedEvent2 = extractEvent(
    createCollectionTx2,
    "Nfts",
    "Created"
  );

  // collection id can be extracted from the event
  const collectionIdAlice = nftsCreatedEvent2.collection as number;

  const createItemTx1 = await api.tx.Nfts.mint({
    collection: collectionIdBob,
    item: 1,
    mint_to: MultiAddress.Id(bob.address),
    witness_data: undefined,
  }).signAndSubmit(alice);

  const createItemTx2 = await api.tx.Nfts.mint({
    collection: collectionIdAlice,
    item: 1,
    mint_to: MultiAddress.Id(alice.address),
    witness_data: undefined,
  }).signAndSubmit(alice);

  expect(createItemTx1.ok).toBe(true);
  expect(createItemTx2.ok).toBe(true);

  /////////

  const ITEM_PRICE = 1n * 10n ** 10n;

  // 1. Bob can create a swap
  const createSwapTx = await api.tx.Nfts.create_swap({
    offered_collection: collectionIdBob,
    offered_item: 1,
    desired_collection: collectionIdAlice,
    maybe_desired_item: undefined, // If undefined, any item from the desired collection can be swapped
    maybe_price: {
      // Set undefined if no additional payment is required
      amount: ITEM_PRICE,
      direction: { type: "Receive", value: undefined }, // Send if you want to pay, receive if you want to receive
    },
    duration: 1000, // The deadline for the swap in blocks
  }).signAndSubmit(bob);

  expect(createSwapTx.ok).toBe(true);

  // 2. Can query the swap
  const swap = await api.query.Nfts.PendingSwapOf.getValue(collectionIdBob, 1);
  expect(swap?.price?.amount).toBe(ITEM_PRICE);

  const bobBalanceBefore = await api.query.System.Account.getValue(bob.address);

  // 3. Alice can claim the swap
  const claimSwapTx = await api.tx.Nfts.claim_swap({
    send_collection: collectionIdAlice,
    send_item: 1,
    receive_collection: collectionIdBob,
    receive_item: 1,
    witness_price: {
      amount: ITEM_PRICE,
      direction: { type: "Receive", value: undefined },
    },
  }).signAndSubmit(alice);
  expect(claimSwapTx.ok).toBe(true);

  /// Expect swap success
  const bobBalanceAfter = await api.query.System.Account.getValue(bob.address);
  // Bob received the additional price because "Receive" direction
  expect(bobBalanceAfter.data.free).toBe(
    bobBalanceBefore.data.free + ITEM_PRICE
  );

  const ownerAlicesToken = await api.query.Nfts.Item.getValue(
    collectionIdAlice,
    1
  );
  const ownerBobsToken = await api.query.Nfts.Item.getValue(collectionIdBob, 1);
  // Now bob owns the item from alice and alice owns the item from bob
  expect(ownerAlicesToken?.owner).toBe(bob.address);
  expect(ownerBobsToken?.owner).toBe(alice.address);
});

test("Items (NFT) swap can be cancelled", async ({ api, signers }) => {
  const { alice, bob } = signers;

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
  const collectionIdBob = nftsCreatedEvent.collection as number;

  const createCollectionTx2 = await api.tx.Nfts.create({
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
  const nftsCreatedEvent2 = extractEvent(
    createCollectionTx2,
    "Nfts",
    "Created"
  );

  // collection id can be extracted from the event
  const collectionIdAlice = nftsCreatedEvent2.collection as number;

  const createItemTx1 = await api.tx.Nfts.mint({
    collection: collectionIdBob,
    item: 1,
    mint_to: MultiAddress.Id(bob.address),
    witness_data: undefined,
  }).signAndSubmit(alice);

  const createItemTx2 = await api.tx.Nfts.mint({
    collection: collectionIdAlice,
    item: 1,
    mint_to: MultiAddress.Id(alice.address),
    witness_data: undefined,
  }).signAndSubmit(alice);

  expect(createItemTx1.ok).toBe(true);
  expect(createItemTx2.ok).toBe(true);

  /////////

  const ITEM_PRICE = 1n * 10n ** 10n;

  // 1. Bob can create a swap
  const createSwapTx = await api.tx.Nfts.create_swap({
    offered_collection: collectionIdBob,
    offered_item: 1,
    desired_collection: collectionIdAlice,
    maybe_desired_item: undefined, // If undefined, any item from the desired collection can be swapped
    maybe_price: {
      // Set undefined if no additional payment is required
      amount: ITEM_PRICE,
      direction: { type: "Receive", value: undefined }, // Send if you want to pay, receive if you want to receive
    },
    duration: 1000, // The deadline for the swap in blocks
  }).signAndSubmit(bob);

  expect(createSwapTx.ok).toBe(true);

  // 2. Bob can cancel the swap
  const cancelSwapTx = await api.tx.Nfts.cancel_swap({
    offered_collection: collectionIdBob,
    offered_item: 1,
  }).signAndSubmit(bob);
  expect(cancelSwapTx.ok).toBe(true);

  const swap = await api.query.Nfts.PendingSwapOf.getValue(collectionIdBob, 1);
  expect(swap).toBeUndefined();
});
