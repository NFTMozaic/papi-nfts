export const getConfig = () => {
  const CHAIN_URL = process.env.CHAIN_URL || "ws://localhost:8000";

  return {
    CHAIN_URL,
  };
};

export const env = getConfig();
