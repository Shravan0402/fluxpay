// wagmi.config.ts (Example)
import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, polygonAmoy } from 'wagmi/chains'
import { injected, metaMask, safe } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia, polygonAmoy], // Ensure all desired chains are here
  connectors: [
    injected(),
    metaMask(),
     safe(), // If you need Gnosis Safe
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
})
