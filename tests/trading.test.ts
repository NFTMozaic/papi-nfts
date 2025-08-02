import { test } from "./utils/test";
import { MultiAddress } from "@polkadot-api/descriptors";
import { Enum } from "polkadot-api";

test("Item (NFT) trading", async ({ api, signers }) => {
  const { alice: buyer, bob: seller } = signers;

  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(buyer.address),
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
  }).signAndSubmit(buyer);

  const [createdEvent] = api.event.Nfts.Created.filter(createCollectionTx.events);
  const collectionId = createdEvent.collection;
  
  const createItemTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(seller.address),
    witness_data: undefined,
  }).signAndSubmit(buyer);

  expect(createItemTx.ok).toBe(true);

  /////////

  const ITEM_PRICE = 1n * 10n ** 10n;

  // 1. Item owner can set price
  const setPriceTx = await api.tx.Nfts.set_price({
    collection: collectionId,
    item: 1,
    price: ITEM_PRICE,
    whitelisted_buyer: undefined, // Optionally can be restricted to a specific buyer
  }).signAndSubmit(seller);
  expect(setPriceTx.ok).toBe(true);

  // 2. Can query item price
  const itemPrice = await api.query.Nfts.ItemPriceOf.getValue(collectionId, 1);
  expect(itemPrice?.[0]).toBe(ITEM_PRICE);

  const sellerBalanceBefore = await api.query.System.Account.getValue(
    seller.address
  );

  // 3. Buyer can buy the item
  const buyItemTx = await api.tx.Nfts.buy_item({
    collection: collectionId,
    item: 1,
    bid_price: ITEM_PRICE, // this price should be equal or higher than the price set by bob
  }).signAndSubmit(buyer);
  expect(buyItemTx.ok).toBe(true);

  // Buyer is the new owner
  const item = await api.query.Nfts.Item.getValue(collectionId, 1);
  expect(item?.owner).toBe(buyer.address);

  // Seller get the price
  const sellerBalanceAfter = await api.query.System.Account.getValue(
    seller.address
  );
  expect(sellerBalanceAfter.data.free).toBe(
    sellerBalanceBefore.data.free + ITEM_PRICE
  );
});

test("Item (NFT) can be withdrawn from sale", async ({ api, signers }) => {
  const { alice: buyer, bob: seller } = signers;

  const createCollectionTx = await api.tx.Nfts.create({
    admin: MultiAddress.Id(buyer.address),
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
  }).signAndSubmit(buyer);

  const [createdEvent] = api.event.Nfts.Created.filter(createCollectionTx.events);
  const collectionId = createdEvent.collection;
  
  const createItemTx = await api.tx.Nfts.mint({
    collection: collectionId,
    item: 1,
    mint_to: MultiAddress.Id(seller.address),
    witness_data: undefined,
  }).signAndSubmit(buyer);

  expect(createItemTx.ok).toBe(true);

  /////////

  const ITEM_PRICE = 1n * 10n ** 10n;

  let price = await api.query.Nfts.ItemPriceOf.getValue(collectionId, 1);
  expect(price?.[0]).toBe(undefined);

  // 1. Item owner can set price
  const setPriceTx = await api.tx.Nfts.set_price({
    collection: collectionId,
    item: 1,
    price: ITEM_PRICE,
    whitelisted_buyer: undefined, // Optionally can be restricted to a specific buyer
  }).signAndSubmit(seller);
  expect(setPriceTx.ok).toBe(true);

  price = await api.query.Nfts.ItemPriceOf.getValue(collectionId, 1);
  expect(price?.[0]).toBe(ITEM_PRICE);

  // 2. Item owner can withdraw the item from sale
  const withdrawItemTx = await api.tx.Nfts.set_price({
    collection: collectionId,
    item: 1,
    price: undefined,
    whitelisted_buyer: undefined,
  }).signAndSubmit(seller);
  expect(withdrawItemTx.ok).toBe(true);

  // Item price is 0
  price = await api.query.Nfts.ItemPriceOf.getValue(collectionId, 1);
  expect(price?.[0]).toBe(undefined);

  // 3. Buyer cannot buy the item
  const buyItemTx = await api.tx.Nfts.buy_item({
    collection: collectionId,
    item: 1,
    bid_price: ITEM_PRICE,
  }).signAndSubmit(buyer);
  expect(buyItemTx.ok).toBe(false);
  expect((buyItemTx.dispatchError?.value as any).value.type).toBe("NotForSale");
});
