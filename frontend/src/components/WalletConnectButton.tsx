'use client';

import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import Button from './Button'; 
import { motion } from 'framer-motion';

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error, status } = useConnect();
  const filteredConnectors = connectors.filter(
    (connector) =>
      connector.id === "metaMaskSDK" 
  );
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-2 text-white bg-white bg-opacity-10 p-4 rounded-xl shadow-lg border border-white border-opacity-10"
      >
        <p className="text-lg">Connected: {address?.substring(0, 6)}...{address?.substring(address.length - 4)}</p>
        <Button onClick={() => disconnect()} variant="outline" className="w-full">
          Disconnect Wallet
        </Button>
      </motion.div>
    );
  }

  return (

    <Button   onClick={() => {
      connect({ connector: filteredConnectors[0]})
    }} variant="primary">
      Connect Wallet to Continue
    </Button>
  );
}
