import { createWalletClient, http, createPublicClient, parseEther, formatEther, hashMessage, encodePacked, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy } from 'viem/chains';
import { readContract, writeContract } from 'viem/actions';
import axios from 'axios';

// Configuration
const PRIVATE_KEY = '0x7cf73cff18de223ccfc1188c034f639768a90fd628393d0538fdb54d62b64695';
const WEATHER_TOKEN_ADDRESS = '0xec690C24B7451B85B6167a06292e49B5DA822fBE';
const FACILITATOR_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8000';

// Create account and clients
const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://api.zan.top/polygon-amoy'),
});

const walletClient = createWalletClient({
  account,
  chain: polygonAmoy,
  transport: http('https://api.zan.top/polygon-amoy'),
});

// WeatherToken ABI (simplified)
const WEATHER_TOKEN_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

async function getTokenInfo() {
  try {
    const [name, symbol, decimals] = await Promise.all([
      readContract(publicClient, {
        address: WEATHER_TOKEN_ADDRESS,
        abi: WEATHER_TOKEN_ABI,
        functionName: 'name',
      }),
      readContract(publicClient, {
        address: WEATHER_TOKEN_ADDRESS,
        abi: WEATHER_TOKEN_ABI,
        functionName: 'symbol',
      }),
      readContract(publicClient, {
        address: WEATHER_TOKEN_ADDRESS,
        abi: WEATHER_TOKEN_ABI,
        functionName: 'decimals',
      }),
    ]);

    return { name, symbol, decimals };
  } catch (error) {
    console.error('Error getting token info:', error);
    return { name: 'WeatherToken', symbol: 'WAT', decimals: 18 };
  }
}

async function getBalance(address: string) {
  try {
    const balance = await readContract(publicClient, {
      address: WEATHER_TOKEN_ADDRESS,
      abi: WEATHER_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    });
    return balance;
  } catch (error) {
    console.error('Error getting balance:', error);
    return BigInt(0);
  }
}

async function mintTokens(to: string, amount: string) {
  try {
    console.log(`🪙 Minting ${amount} WAT tokens to ${to}...`);
    
    const hash = await writeContract(walletClient, {
      address: WEATHER_TOKEN_ADDRESS,
      abi: WEATHER_TOKEN_ABI,
      functionName: 'mint',
      args: [to as `0x${string}`, parseEther(amount)],
    });

    console.log(`⏳ Transaction submitted: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log(`✅ Tokens minted successfully! Gas used: ${receipt.gasUsed}`);
    
    return receipt;
  } catch (error) {
    console.error('Error minting tokens:', error);
    throw error;
  }
}

async function requestWeatherWithoutPayment() {
  try {
    console.log('\n🌤️ Requesting weather without payment...');
    const response = await axios.post(`${BACKEND_URL}/weather`, {
      message: 'What is the weather in New Delhi?',
      user_address: account.address,
    });
    
    console.log('Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error requesting weather:', error);
    throw error;
  }
}

async function createEIP3009Authorization(
  from: string,
  to: string,
  amount: bigint,
  validAfter: number,
  validBefore: number,
  nonce: string
) {
  // EIP-3009 authorization message structure
  const message = {
    from,
    to,
    amount: amount.toString(),
    validAfter,
    validBefore,
    nonce,
  };

  // Create the EIP-3009 authorization hash
  // This should match the contract's hash function exactly
  // The contract uses: keccak256(abi.encodePacked(from, to, value, validAfter, validBefore, nonce, address(this)))
  // Then during recovery, it adds the Ethereum Signed Message prefix
  const contractAddress = WEATHER_TOKEN_ADDRESS;
  const packedData = encodePacked(
    ['address', 'address', 'uint256', 'uint256', 'uint256', 'bytes32', 'address'],
    [from as `0x${string}`, to as `0x${string}`, amount, BigInt(validAfter), BigInt(validBefore), nonce as `0x${string}`, contractAddress as `0x${string}`]
  );
  
  // Hash the packed data (inner hash)
  const innerHash = keccak256(packedData);
  
  try {
    // Sign the inner hash directly
    // The contract will add the Ethereum Signed Message prefix during recovery
    const signature = await walletClient.signMessage({
      message: { raw: innerHash },
    });
    
    return {
      authorization: message,
      signature,
    };
  } catch (error) {
    console.error('Error creating authorization:', error);
    throw error;
  }
}

async function settlePayment(authorization: any, signature: string) {
  try {
    console.log('\n💰 Settling payment...');
    
    const paymentPayload = {
      scheme: 'exact',
      network: 'polygon-amoy',
      payload: {
        authorization,
        signature,
      },
    };

    const paymentRequirements = {
      scheme: 'exact',
      network: 'polygon-amoy',
      asset: WEATHER_TOKEN_ADDRESS,
      payTo: WEATHER_TOKEN_ADDRESS,
      maxAmountRequired: '10000000000000000', // 0.01 WAT
    };

    const response = await axios.post(`${FACILITATOR_URL}/settle`, {
      paymentPayload,
      paymentRequirements,
    });

    console.log('Settlement response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error settling payment:', error);
    throw error;
  }
}

async function requestWeatherWithPayment(authorization: any, signature: string) {
  try {
    console.log('\n🌤️ Requesting weather with payment proof...');
    console.log('Payment proof:', signature);
    
    // Create the payment payload that the backend expects
    const paymentPayload = {
      scheme: "exact",
      network: "polygon-amoy",
      payload: {
        authorization: authorization,
        signature: signature
      }
    };
    
    const response = await axios.post(`${BACKEND_URL}/weather`, {
      message: 'What is the weather in New Delhi?',
      user_address: account.address,
      payment_proof: JSON.stringify(paymentPayload),
    });
    
    console.log('Weather response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error requesting weather with payment:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Weather API Payment Client');
    console.log(`📍 Account: ${account.address}`);
    console.log(`🌐 Network: ${polygonAmoy.name} (${polygonAmoy.id})`);
    console.log(`🪙 Token: ${WEATHER_TOKEN_ADDRESS}`);

    // Get token info
    const tokenInfo = await getTokenInfo();
    console.log(`📊 Token: ${tokenInfo.name} (${tokenInfo.symbol})`);

    // Check initial balance
    const initialBalance = await getBalance(account.address);
    console.log(`💰 Initial balance: ${formatEther(initialBalance)} ${tokenInfo.symbol}`);

    // Mint tokens if balance is low
    if (initialBalance < parseEther('1')) {
      await mintTokens(account.address, '10');
      const newBalance = await getBalance(account.address);
      console.log(`💰 New balance: ${formatEther(newBalance)} ${tokenInfo.symbol}`);
    }

    // Step 1: Request weather without payment
    const paymentRequired = await requestWeatherWithoutPayment();
    
    if (paymentRequired.status === 'payment_required') {
      console.log(`\n💳 Payment required: ${paymentRequired.metadata.price}`);
      
      // Step 2: Create EIP-3009 authorization
      const now = Math.floor(Date.now() / 1000);
      const nonce = `0x${Math.random().toString(16).substr(2, 64).padEnd(64, '0')}`;
      
      const { authorization, signature } = await createEIP3009Authorization(
        account.address,
        WEATHER_TOKEN_ADDRESS,
        parseEther('0.01'), // 0.01 WAT
        now,
        now + 300, // 5 minutes validity
        nonce
      );

      console.log('📝 Authorization created:', authorization);
      console.log('✍️ Signature:', signature);

      // Step 3: Settle payment
      const settlement = await settlePayment(authorization, signature);
      
      if (settlement.success) {
        console.log(`✅ Payment settled! Transaction: ${settlement.transaction}`);
        
        // Step 4: Request weather with payment proof
        await requestWeatherWithPayment(authorization, signature);
      } else {
        console.error('❌ Payment settlement failed:', settlement.errorReason);
      }
    }

  } catch (error) {
    console.error('❌ Error in main:', error);
  }
}

// Run the client
if (require.main === module) {
  main().catch(console.error);
}

export { main, getBalance, mintTokens, requestWeatherWithoutPayment, settlePayment, requestWeatherWithPayment };
