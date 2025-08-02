import { test as vitestTest } from "vitest";
import { getWsProvider, WsEvent } from "polkadot-api/ws-provider/node";
import { createClient, PolkadotClient, TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";
import { getSignerFromMnemonic, PolkadotSignerWithAddress } from "./signer";
import { env } from "./env";

export const test = (
  name: string,
  fn: (params: {
    api: TypedApi<typeof dot>;
    client: PolkadotClient;
    signers: Record<string, PolkadotSignerWithAddress>;
  }) => Promise<void>
) => {
  vitestTest(name, async () => {
    const cleanupErrorHandler = (reason: any) => {
      if (
        reason?.message?.includes("ChainHead disjointed") ||
        reason?.constructor?.name === "DisjointError"
      ) {
        console.warn("Suppressed cleanup error:", reason.message);
        return;
      }
      throw reason;
    };

    process.on("unhandledRejection", cleanupErrorHandler);

    const provider = getWsProvider(env.CHAIN_URL, (status) => {
      // const provider = getWsProvider("wss://asset-hub-paseo.dotters.network", (status) => {
      switch (status.type) {
        case WsEvent.CONNECTED:
          break;
        case WsEvent.ERROR:
          console.log("Error", status.event);
          break;
        case WsEvent.CLOSE:
          console.log("Close", status.event);
          break;
        case WsEvent.CONNECTING:
          break;
      }
    });

    const client = createClient(provider);
    const api = client.getTypedApi(dot);

    const signers = {
      alice: getSignerFromMnemonic("//Alice"),
      bob: getSignerFromMnemonic("//Bob"),
      charlie: getSignerFromMnemonic("//Charlie"),
      dave: getSignerFromMnemonic("//Dave"),
      eve: getSignerFromMnemonic("//Eve"),
      ferdie: getSignerFromMnemonic("//Ferdie"),
    };

    try {
      await fn({ api, client, signers });
    } finally {
      client.destroy();

      // Wait a bit for cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      process.removeListener("unhandledRejection", cleanupErrorHandler);
    }
  });
};
