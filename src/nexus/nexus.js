import { NexusSDK } from "@avail-project/nexus-core";

const sdk = new NexusSDK({ network: "mainnet" });

export async function initNexus(provider) {
  await sdk.initialize(provider);
}

export async function getUnifiedBalances() {
  return sdk.getUnifiedBalances();
}

export async function bridge(data) {
  return sdk.bridgeAndExecute({
    amount: data.amount,
    token: "USDT",
    toChainId: data.toChainId,
    execute: {
      contractAbi: data.contractAbi,
      contractAddress: data.contractAddress,
      functionName: data.functionName,
      buildFunctionParams: data.buildFunctionParams,
      value: data.value,
      enableTransactionPolling: true,
      waitForReceipt: true,
      tokenApproval: {
        token: "USDT",
        amount: data.amount,
      },
    },
  });
}
