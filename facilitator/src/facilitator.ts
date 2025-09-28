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
// @ts-ignore
import { Lightning } from "@inco/js/lite";

config();

const FACILITATOR_URL = process.env.FACILITATOR_URL || "http://localhost:3000";
const WEATHER_API_URL = process.env.WEATHER_API_URL || "http://localhost:8000";

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

// Initialize Inco configuration
let incoConfig: any;
const initInco = async () => {
  const chainId = polygonAmoy.id; // 80002 for Polygon Amoy
  incoConfig = Lightning.latest("alphanet", chainId);
};

// Types for our endpoints
interface VerifyRequest {
  paymentPayload: {
    scheme: string;
    network: string;
    payload: {
      authorization: {
        from: string;
        to: string;
        encryptedAmount: string;
        validAfter: number;
        validBefore: number;
        nonce: string;
      };
      signature: string;
      attestedProof?: {
        plaintext: string;
        signature: string;
      };
    };
  };
  paymentRequirements: {
    scheme: string;
    network: string;
    asset: string;
    payTo: string;
    maxAmountRequired: string;
    extra?: {
      isConfidential?: boolean;
      name?: string;
      version?: string;
    };
  };
}

interface SettleRequest extends VerifyRequest {}

interface GenerateCTRequest {
  plainTextValue: string;
  accountAddress: string;
  dappAddress: string;
}

interface WeatherRequest {
  message: string;
  user_address?: string;
  payment_proof?: string;
}

// Mock wallet for demonstration (in production, use environment variables)
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0x7cf73cff18de223ccfc1188c034f639768a90fd628393d0538fdb54d62b64695";
const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: polygonAmoy,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(),
});

// Weather Token Contract ABI (simplified)
const WEATHER_TOKEN_ABI = [
  {
    "inputs": [
      {"name": "from", "type": "address"},
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"},
      {"name": "validAfter", "type": "uint256"},
      {"name": "validBefore", "type": "uint256"},
      {"name": "nonce", "type": "bytes32"},
      {"name": "v", "type": "uint8"},
      {"name": "r", "type": "bytes32"},
      {"name": "s", "type": "bytes32"}
    ],
    "name": "transferWithAuthorization",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "user", "type": "address"}],
    "name": "hasWeatherApiAccess",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWeatherApiPrice",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "pure",
    "type": "function"
  }
] as const;

// Verify endpoint - checks if payment authorization is valid
app.post("/verify", async (req: Request, res: Response) => {
  try {
    const { paymentPayload, paymentRequirements }: VerifyRequest = req.body;

    console.log("🔍 Verifying weather API payment...");
    console.log("From:", paymentPayload.payload.authorization.from);
    console.log("To:", paymentPayload.payload.authorization.to);
    console.log("Asset:", paymentRequirements.asset);

    // Basic validation
    if (paymentPayload.scheme !== "exact") {
      return res.json({
        isValid: false,
        invalidReason: "unsupported_scheme",
        payer: paymentPayload.payload.authorization.from,
      });
    }

    // Check if addresses match
    if (
      getAddress(paymentPayload.payload.authorization.to) !==
      getAddress(paymentRequirements.payTo)
    ) {
      return res.json({
        isValid: false,
        invalidReason: "invalid_recipient",
        payer: paymentPayload.payload.authorization.from,
      });
    }

    // Check time validity
    const now = Math.floor(Date.now() / 1000);
    if (paymentPayload.payload.authorization.validAfter > now) {
      return res.json({
        isValid: false,
        invalidReason: "authorization_not_yet_valid",
        payer: paymentPayload.payload.authorization.from,
      });
    }

    if (paymentPayload.payload.authorization.validBefore < now + 6) {
      return res.json({
        isValid: false,
        invalidReason: "authorization_expired",
        payer: paymentPayload.payload.authorization.from,
      });
    }

    console.log("✅ Payment verification successful");

    res.json({
      isValid: true,
      invalidReason: undefined,
      payer: paymentPayload.payload.authorization.from,
    });
  } catch (error) {
    console.error("❌ Verification error:", error);
    res.status(400).json({
      isValid: false,
      invalidReason: "verification_error",
      payer: "",
    });
  }
});

// Settle endpoint - executes the payment on blockchain
app.post("/settle", async (req: Request, res: Response) => {
  try {
    const { paymentPayload, paymentRequirements }: SettleRequest = req.body;

    console.log("💰 Settling weather API payment...");

    // Check if attested proof is provided for balance sufficiency
    if (paymentPayload.payload.attestedProof) {
      console.log("🔐 Verifying attested balance proof...");

      const { plaintext, signature } = paymentPayload.payload.attestedProof;

      // Check if the plaintext indicates sufficient balance (should be true/1)
      const hasSufficientBalance = plaintext === "0x" + "0".repeat(63) + "1";

      if (!hasSufficientBalance) {
        console.log("❌ Attested proof indicates insufficient balance");
        return res.json({
          success: false,
          errorReason: "Insufficient balance verified by attested compute",
          transaction: "",
          network: paymentPayload.network,
          payer: paymentPayload.payload.authorization.from,
        });
      }

      console.log("✅ Attested balance proof verified - user has sufficient balance");
    }

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

    // Execute the transferWithAuthorization transaction
    const txHash = await walletClient.writeContract({
      address: paymentRequirements.asset as Address,
      abi: WEATHER_TOKEN_ABI,
      functionName: "transferWithAuthorization",
      args: [
        paymentPayload.payload.authorization.from as Address,
        paymentPayload.payload.authorization.to as Address,
        BigInt(paymentPayload.payload.authorization.encryptedAmount),
        BigInt(paymentPayload.payload.authorization.validAfter),
        BigInt(paymentPayload.payload.authorization.validBefore),
        paymentPayload.payload.authorization.nonce as `0x${string}`,
        v,
        r as `0x${string}`,
        s as `0x${string}`,
      ],
    });

    console.log("✅ Transaction submitted:", txHash);

    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

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
      network: paymentPayload.network,
      payer: paymentPayload.payload.authorization.from,
    });
  } catch (error) {
    console.error("❌ Settlement error:", error);
    res.status(500).json({
      success: false,
      errorReason: "settlement_error",
      transaction: "",
      network: req.body.paymentPayload?.network || "",
      payer: req.body.paymentPayload?.payload?.authorization?.from || "",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Generate Confidential Token (CT) endpoint - encrypts plaintext values
app.post("/generateCT", async (req: Request, res: Response) => {
  try {
    const { plainTextValue, accountAddress, dappAddress }: GenerateCTRequest = req.body;

    console.log("🔐 Generating confidential token encryption...");
    console.log("Plain text value:", plainTextValue);
    console.log("Account address:", accountAddress);
    console.log("Dapp address:", dappAddress);

    if (!incoConfig) {
      await initInco();
    }

    // Convert string to BigInt if needed
    let valueToEncrypt: bigint;
    if (typeof plainTextValue === "string") {
      if (plainTextValue.includes(".")) {
        valueToEncrypt = parseEther(plainTextValue);
      } else {
        valueToEncrypt = BigInt(plainTextValue);
      }
    } else {
      valueToEncrypt = BigInt(plainTextValue);
    }

    // Encrypt the value using Inco
    const encryptedCipherText = await incoConfig.encrypt(valueToEncrypt, {
      accountAddress: accountAddress,
      dappAddress: dappAddress,
    });

    console.log("✅ Encryption successful");

    res.json({
      success: true,
      plainTextValue: plainTextValue,
      encryptedCipherText: encryptedCipherText,
      accountAddress: accountAddress,
      dappAddress: dappAddress,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Encryption error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: "Failed to encrypt value",
    });
  }
});

// Weather API endpoint - gated behind payment
app.post("/weather", async (req: Request, res: Response) => {
  try {
    const { message, user_address, payment_proof }: WeatherRequest = req.body;

    console.log("🌤️ Weather API request received");
    console.log("Message:", message);
    console.log("User:", user_address);
    console.log("Payment proof:", payment_proof);

    // For demo purposes, we'll simulate payment verification
    // In production, you would verify the payment proof here
    if (!payment_proof) {
      return res.status(402).json({
        error: "Payment required",
        message: "Weather API access requires payment. Please provide payment proof.",
        price: "0.01 WAT",
        paymentEndpoint: `${FACILITATOR_URL}/settle`
      });
    }

    // Simulate weather data response
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
    message: "Weather API Payment Facilitator",
    timestamp: new Date().toISOString(),
    endpoints: {
      verify: "POST /verify",
      settle: "POST /settle",
      generateCT: "POST /generateCT",
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

// Initialize Inco and start server
initInco()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`
🚀 Weather API Payment Facilitator Started!
📍 Server: http://localhost:${PORT}
🔍 Health: http://localhost:${PORT}/health
🎯 Supported: http://localhost:${PORT}/supported

🔧 Endpoints:
   POST /verify - Verify weather API payment authorization
   POST /settle - Settle weather API payment on blockchain  
   POST /generateCT - Generate encrypted ciphertext from plaintext
   POST /weather - Access weather API (payment required)
   GET  /health - Health check
   GET  /supported - Supported payment types

💡 Ready to process weather API payments with EIP-3009!
🌤️ Weather API gated behind confidential payments!
    `);
    });
  })
  .catch((error) => {
    console.error("❌ Failed to initialize Inco:", error);
    process.exit(1);
  });
