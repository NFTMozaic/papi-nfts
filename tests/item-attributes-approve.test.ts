import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { Binary, Enum } from "polkadot-api";

test("Item (NFT) attributes approve", async ({ api, signers }) => {
  const { alice, bob, charlie, dave } = signers;

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

  // nfts.Created event is emitted when the collection is created
  const [createdEvent] = api.event.Nfts.Created.filter(createCollectionTx.events);
  const collectionId = createdEvent.collection;

  const createItemTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(bob.address),
    witness_data: undefined,
  }).signAndSubmit(alice);

  expect(createItemTx.ok).toBe(true);

  const approveAttributeTxCharlie = await api.tx.Nfts.approve_item_attributes({
    collection: collectionId,
    delegate: MultiAddress.Id(charlie.address),
    item: 1,
  }).signAndSubmit(bob);

  expect(approveAttributeTxCharlie.ok).toBe(true);

  /// Bob can approve several accounts to set the attribute

  const approveAttributeTxDave = await api.tx.Nfts.approve_item_attributes({
    collection: collectionId,
    delegate: MultiAddress.Id(dave.address),
    item: 1,
  }).signAndSubmit(bob);

  expect(approveAttributeTxDave.ok).toBe(true);

  /// query approvals
  let approvals = await api.query.Nfts.ItemAttributesApprovalsOf.getValue(
    collectionId,
    1
  );
  expect(approvals.length).toBe(2);
  expect(approvals).toContain(charlie.address);
  expect(approvals).toContain(dave.address);

  // Dave can set the attribute
  const setAttributeTxDave = await api.tx.Nfts.set_attribute({
    collection: collectionId,
    maybe_item: 1,
    namespace: Enum("Account", dave.address),
    key: Binary.fromText("Who"),
    value: Binary.fromText("Dave"),
  }).signAndSubmit(dave);

  expect(setAttributeTxDave.ok).toBe(true);

  // Bob can remove approval for Dave
  const removeApprovalTx = await api.tx.Nfts.cancel_item_attributes_approval({
    collection: collectionId,
    item: 1,
    delegate: MultiAddress.Id(dave.address),
    witness: 1, // The number of attributes set by Dave, this number should not be less than the number of attributes set by Dave
  }).signAndSubmit(bob);

  expect(removeApprovalTx.ok).toBe(true);

  approvals = await api.query.Nfts.ItemAttributesApprovalsOf.getValue(
    collectionId,
    1
  );
  expect(approvals.length).toBe(1);
  expect(approvals).toContain(charlie.address);

  // The attribute set by Dave is removed
  // TODO: chopsticks bug, the number of attributes will be huge

  // const attributes = await api.query.Nfts.Attribute.getEntries(collectionId, 1);
  // expect(attributes.length).toBe(0);
  // expect(attributes).not.toContain(dave.address);
});
