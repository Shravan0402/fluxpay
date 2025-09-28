import express, { Request, Response } from "express";
import cors from "cors";
import { config } from "dotenv";
import {
  createWalletClient,
  createPublicClient,
  http,
  getAddress,
  parseEther,
  Address,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";

// 0G Testnet configuration
const ogTestnet = {
  id: 16602,
  name: "0G-Galileo-Testnet",
  nativeCurrency: {
    name: "OG",
    symbol: "OG",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://evmrpc-testnet.0g.ai"],
    },
    public: {
      http: ["https://evmrpc-testnet.0g.ai"],
    },
  },
  blockExplorers: {
    default: {
      name: "0G Chainscan",
      url: "https://chainscan-galileo.0g.ai",
    },
  },
  testnet: true,
} as const;

config();

const FACILITATOR_URL = process.env.FACILITATOR_URL || "http://localhost:3000";
const WEATHER_API_URL = process.env.WEATHER_API_URL || "http://localhost:8000";

// Weather Token Contract Configuration
const WEATHER_TOKEN_ADDRESS_POLYGON = "0xec690C24B7451B85B6167a06292e49B5DA822fBE"; // Polygon Amoy
const WEATHER_TOKEN_ADDRESS_OG = "0x40E81E7748323C92382C97f050E5C7975DBdea18"; // 0G Testnet
// any number of chains that he has assets on 
// Create wallet client for signing transactions
const account = privateKeyToAccount('0x7cf73cff18de223ccfc1188c034f639768a90fd628393d0538fdb54d62b64695' as `0x${string}`);

// Polygon Amoy clients
const polygonPublicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://polygon-amoy.drpc.org'),
});

const polygonWalletClient = createWalletClient({
  account,
  chain: polygonAmoy,
  transport: http('https://polygon-amoy.drpc.org'),
});

// 0G Testnet clients
const ogPublicClient = createPublicClient({
  chain: ogTestnet,
  transport: http('https://evmrpc-testnet.0g.ai'),
});

const ogWalletClient = createWalletClient({
  account,
  chain: ogTestnet,
  transport: http('https://evmrpc-testnet.0g.ai'),
});

// Legacy clients (keeping for compatibility)
const walletClient = polygonWalletClient;

// WeatherToken ABI (simplified for EIP-3009)
const WEATHER_TOKEN_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "from", "type": "address"},
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "uint256", "name": "value", "type": "uint256"},
      {"internalType": "uint256", "name": "validAfter", "type": "uint256"},
      {"internalType": "uint256", "name": "validBefore", "type": "uint256"},
      {"internalType": "bytes32", "name": "nonce", "type": "bytes32"},
      {"internalType": "uint8", "name": "v", "type": "uint8"},
      {"internalType": "bytes32", "name": "r", "type": "bytes32"},
      {"internalType": "bytes32", "name": "s", "type": "bytes32"}
    ],
    "name": "transferWithAuthorization",
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
  }
] as const;

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// Types for our endpoints
interface VerifyRequest {
  paymentPayload: {
    scheme: string;
    network: string;
    payload: {
      authorization: {
        from: string;
        to: string;
        encryptedAmount?: string;
        amount?: string;
        validAfter: number;
        validBefore: number;
        nonce: string;
      };
      signature: string;
    };
  };
  paymentRequirements: {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    maxAmountRequired: string;
  };
}

interface SettleRequest {
  paymentPayload: {
    scheme: string;
    network: string;
    payload: {
      authorization: {
        from: string;
        to: string;
        encryptedAmount?: string;
        amount?: string;
        validAfter: number;
        validBefore: number;
        nonce: string;
      };
      signature: string;
    };
  };
  paymentRequirements: {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    maxAmountRequired: string;
  };
}

// Verify endpoint - validates the payment authorization
app.post("/verify", async (req: Request, res: Response) => {
  try {
    const { paymentPayload, paymentRequirements }: VerifyRequest = req.body;

    console.log("🔍 Verifying weather API payment...");
    console.log("From:", paymentPayload.payload.authorization.from);
    console.log("To:", paymentPayload.payload.authorization.to);
    console.log("Asset:", paymentRequirements.asset);

    // Basic validation
    const now = Math.floor(Date.now() / 1000);
    const validAfter = paymentPayload.payload.authorization.validAfter;
    const validBefore = paymentPayload.payload.authorization.validBefore;

    if (now < validAfter) {
      return res.json({
        isValid: false,
        invalidReason: "authorization_not_yet_valid",
      });
    }

    if (now > validBefore) {
      return res.json({
        isValid: false,
        invalidReason: "authorization_expired",
      });
    }

    // Check if the amount matches the required amount
    const requiredAmount = BigInt(paymentRequirements.maxAmountRequired || "0");
    const authorizedAmount = BigInt(paymentPayload.payload.authorization.amount || paymentPayload.payload.authorization.encryptedAmount || "0");

    console.log("Required amount:", requiredAmount.toString());
    console.log("Authorized amount:", authorizedAmount.toString());

    if (authorizedAmount < requiredAmount) {
      return res.json({
        isValid: false,
        invalidReason: "insufficient_amount",
      });
    }

    // Check balance (simplified - in real implementation, this would be done confidentially)
    try {
      const balance = await polygonPublicClient.readContract({
        address: paymentRequirements.asset as Address,
        abi: WEATHER_TOKEN_ABI,
        functionName: 'balanceOf',
        args: [paymentPayload.payload.authorization.from as Address],
      });

      if (balance < requiredAmount) {
        return res.json({
          isValid: false,
          invalidReason: "insufficient_balance",
        });
      }
    } catch (error) {
      console.log("⚠️ Could not check balance, proceeding with verification");
    }

    console.log("✅ Payment verification successful");

    res.json({
      isValid: true,
      invalidReason: null,
    });
  } catch (error) {
    console.error("❌ Verification error:", error);
    res.status(500).json({
      isValid: false,
      invalidReason: "verification_error",
    });
  }
});

// Settle endpoint - executes the payment on blockchain
app.post("/settle", async (req: Request, res: Response) => {
  try {
    const { paymentPayload, paymentRequirements }: SettleRequest = req.body;

    console.log("💰 Settling weather API payment...");

    // First verify the payment
    const verifyResponse = await fetch(`${FACILITATOR_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentPayload, paymentRequirements }),
    });

    const verifyResult = await verifyResponse.json() as any;
    if (!verifyResult.isValid) {
      return res.json({
        success: false,
        errorReason: verifyResult.invalidReason,
        transaction: "",
        network: paymentPayload.network,
        payer: paymentPayload.payload.authorization.from,
      });
    }

    // Parse signature components
    const sig = paymentPayload.payload.signature.startsWith("0x")
      ? paymentPayload.payload.signature.slice(2)
      : paymentPayload.payload.signature;

    const r = "0x" + sig.slice(0, 64);
    const s = "0x" + sig.slice(64, 128);
    const v = parseInt(sig.slice(128, 130), 16);

    console.log("🔗 Executing transferWithAuthorization on blockchain...");

    try {
      // Determine which network to use based on payment requirements
      const isOGTestnet = paymentPayload.network === "og-testnet" || paymentRequirements.asset === WEATHER_TOKEN_ADDRESS_OG;
      
      const targetWalletClient = isOGTestnet ? ogWalletClient : polygonWalletClient;
      const targetPublicClient = isOGTestnet ? ogPublicClient : polygonPublicClient;
      const targetTokenAddress = isOGTestnet ? WEATHER_TOKEN_ADDRESS_OG : WEATHER_TOKEN_ADDRESS_POLYGON;
      
      console.log(`🌐 Cross-chain payment: User on ${isOGTestnet ? '0G Testnet' : 'Polygon Amoy'}, Merchant on 0G Testnet`);
      console.log(`🔗 Using ${isOGTestnet ? '0G Testnet' : 'Polygon Amoy'} for user payment`);
      
      // Step 1: Execute user payment on their network (Polygon Amoy)
      const userTxHash = await polygonWalletClient.writeContract({
        address: WEATHER_TOKEN_ADDRESS_POLYGON as Address,
        abi: WEATHER_TOKEN_ABI,
        functionName: "transferWithAuthorization",
        args: [
          paymentPayload.payload.authorization.from as Address,
          paymentPayload.payload.authorization.to as Address,
          BigInt(paymentPayload.payload.authorization.amount || paymentPayload.payload.authorization.encryptedAmount || "0"),
          BigInt(paymentPayload.payload.authorization.validAfter),
          BigInt(paymentPayload.payload.authorization.validBefore),
          paymentPayload.payload.authorization.nonce as `0x${string}`,
          v,
          r as `0x${string}`,
          s as `0x${string}`,
        ],
      });

      console.log("✅ User payment transaction submitted:", userTxHash);

      // Wait for user payment confirmation
      const userReceipt = await polygonPublicClient.waitForTransactionReceipt({
        hash: userTxHash,
      });

      if (userReceipt.status !== "success") {
        return res.json({
          success: false,
          errorReason: "user_payment_failed",
          transaction: userTxHash,
          network: paymentPayload.network,
          payer: paymentPayload.payload.authorization.from,
        });
      }

      console.log("✅ User payment confirmed on Polygon Amoy");

      // Step 2: Pay merchant on 0G Testnet (facilitator acts as solver)
      const merchantAmount = BigInt(paymentPayload.payload.authorization.amount || paymentPayload.payload.authorization.encryptedAmount || "0");
      const merchantTxHash = await ogWalletClient.writeContract({
        address: WEATHER_TOKEN_ADDRESS_OG as Address,
        abi: [
          {
            inputs: [
              { name: "to", type: "address" },
              { name: "amount", type: "uint256" }
            ],
            name: "transfer",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function"
          }
        ],
        functionName: "transfer",
        args: [
          "0xAF9fC206261DF20a7f2Be9B379B101FAFd983117" as Address, // Merchant address
          merchantAmount,
        ],
      });

      console.log("✅ Merchant payment transaction submitted on 0G Testnet:", merchantTxHash);

      // Wait for merchant payment confirmation
      const merchantReceipt = await ogPublicClient.waitForTransactionReceipt({
        hash: merchantTxHash,
      });

      if (merchantReceipt.status !== "success") {
        return res.json({
          success: false,
          errorReason: "merchant_payment_failed",
          transaction: merchantTxHash,
          network: "base-sepolia",
          payer: account.address,
        });
      }

      console.log("✅ Merchant payment confirmed on Base Sepolia");
      console.log("🎉 Cross-chain payment settled successfully!");

      const receipt = merchantReceipt; // Use merchant receipt for final response
      const txHash = merchantTxHash;

      if (receipt.status !== "success") {
        return res.json({
          success: false,
          errorReason: "transaction_failed",
          transaction: txHash,
          network: paymentPayload.network,
          payer: paymentPayload.payload.authorization.from,
        });
      }

      console.log("🎉 Weather API payment settled successfully!");

      res.json({
        success: true,
        transaction: txHash,
        network: "og-testnet", // Merchant receives payment on 0G Testnet
        payer: paymentPayload.payload.authorization.from,
        crossChain: {
          userNetwork: "polygon-amoy",
          merchantNetwork: "og-testnet",
          userTransaction: userTxHash,
          merchantTransaction: merchantTxHash
        }
      });
    } catch (error) {
      console.error("❌ Transaction error:", error);
      return res.json({
        success: false,
        errorReason: "transaction_error",
        transaction: "",
        network: paymentPayload.network,
        payer: paymentPayload.payload.authorization.from,
      });
    }
  } catch (error) {
    console.error("❌ Settlement error:", error);
    res.status(500).json({
      success: false,
      errorReason: "settlement_error",
      transaction: "",
      network: "unknown",
      payer: "unknown",
    });
  }
});

// Weather endpoint - requires payment
app.post("/weather", async (req: Request, res: Response) => {
  try {
    const { message, user_address, payment_proof } = req.body;

    console.log("🌤️ Weather API request received");
    console.log("Message:", message);
    console.log("User:", user_address);
    console.log("Payment proof:", payment_proof);

    if (!payment_proof) {
      console.log("❌ No payment proof provided");
      return res.status(402).json({
        error: "Payment required",
        message: "Weather API access requires payment. Please provide payment proof.",
        price: "0.01 WAT",
        paymentEndpoint: "http://localhost:3000/settle"
      });
    }

    // Mock weather data
    const weatherData = {
      location: "New Delhi",
      temperature: "28°C",
      condition: "Partly Cloudy",
      humidity: "65%",
      wind: "12 km/h",
      timestamp: new Date().toISOString(),
      payment_verified: true
    };

    console.log("✅ Weather data provided");

    res.json({
      success: true,
      data: weatherData,
      message: "Weather data retrieved successfully",
      payment_verified: true
    });
  } catch (error) {
    console.error("❌ Weather API error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to retrieve weather data",
    });
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    message: "Weather API Payment Facilitator (Real Transactions)",
    timestamp: new Date().toISOString(),
    endpoints: {
      verify: "POST /verify",
      settle: "POST /settle",
      weather: "POST /weather",
      health: "GET /health",
    },
  });
});

// Supported payment types endpoint
app.get("/supported", (req: Request, res: Response) => {
  res.json({
    kinds: [
      {
        x402Version: 1,
        scheme: "exact",
        network: "polygon-amoy",
        extra: {
          isConfidential: true,
          name: "Weather Access Token",
          version: "1",
        },
      },
    ],
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
🚀 Weather API Payment Facilitator (Real Transactions) Started!
📍 Server: http://localhost:${PORT}
🔍 Health: http://localhost:${PORT}/health
🎯 Supported: http://localhost:${PORT}/supported

🔧 Endpoints:
   POST /verify - Verify weather API payment authorization
   POST /settle - Settle weather API payment on blockchain  
   POST /weather - Access weather API (payment required)
   GET  /health - Health check
   GET  /supported - Supported payment types

💡 Ready to process weather API payments with EIP-3009!
🌤️ Weather API gated behind confidential payments!
🪙 Token: ${WEATHER_TOKEN_ADDRESS_POLYGON}
🔑 Account: ${account.address}
  `);
});
