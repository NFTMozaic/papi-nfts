import { createConnection } from "net";
import { env } from "./env";

export async function waitForChopsticks(
  timeout: number = 30000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(env.CHAIN_URL);
    const host = url.hostname;
    const port = parseInt(url.port) || 8000;
    
    console.log(`Waiting for Chopsticks on ${host}:${port}...`);
    
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Chopsticks not available on ${host}:${port} within ${timeout}ms`
        )
      );
    }, timeout);

    const checkConnection = () => {
      const client = createConnection(port, host);

      client.on("connect", () => {
        client.end();
        clearTimeout(timer);
        console.log(`✅ Chopsticks is running on ${host}:${port}`);
        resolve();
      });

      client.on("error", () => {
        setTimeout(checkConnection, 500);
      });
    };

    checkConnection();
  });
}

waitForChopsticks().catch((error) => {
  console.error("Failed to wait for Chopsticks:", error.message);
  process.exit(1);
});
