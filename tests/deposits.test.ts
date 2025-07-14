import { describe } from "vitest";
import { test } from "./utils/test";
import { ATTRIBUTE_DEPOSIT_BASE, COLLECTION_DEPOSIT, DEPOSIT_PER_BYTE, ITEM_DEPOSIT, METADATA_DEPOSIT_BASE } from "./utils/constants";

describe("NFTs pallet Deposits", () => {
  test("For collection", async ({ api }) => {
    const collectionDeposit = await api.constants.Nfts.CollectionDeposit();
    expect(collectionDeposit).toBe(COLLECTION_DEPOSIT);
  });

  test("For item", async ({ api }) => {
    const itemDeposit = await api.constants.Nfts.ItemDeposit();
    expect(itemDeposit).toBe(ITEM_DEPOSIT);
  });

  test("For metadata", async ({ api }) => {
    const metadataDepositBase = await api.constants.Nfts.MetadataDepositBase();
    expect(metadataDepositBase).toBe(METADATA_DEPOSIT_BASE);
  });

  test("For attributes", async ({ api }) => {
    const attributeDepositBase = await api.constants.Nfts.AttributeDepositBase();
    expect(attributeDepositBase).toBe(ATTRIBUTE_DEPOSIT_BASE);
  });

  test("For per byte", async ({ api }) => {
    const depositPerByte = await api.constants.Nfts.DepositPerByte();
    expect(depositPerByte).toBe(DEPOSIT_PER_BYTE);
  });
});