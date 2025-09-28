// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title WeatherToken
 * @dev EIP-3009 compliant token for gating weather API access
 * Based on Coinbase's EIP-3009 implementation
 */
contract WeatherToken is ERC20, Ownable {
    using ECDSA for bytes32;

    // EIP-3009: Transfer with Authorization
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);

    // Mapping to track used authorizations
    mapping(address => mapping(bytes32 => bool)) private _authorizationStates;

    // Weather API access price (in wei, 0.01 tokens = 10^16 wei)
    uint256 public constant WEATHER_API_PRICE = 10**16; // 0.01 tokens

    constructor() ERC20("Weather Access Token", "WAT") Ownable(msg.sender) {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**18); // 1M tokens
    }

    /**
     * @dev Transfer with authorization (EIP-3009)
     * @param from The address to transfer from
     * @param to The address to transfer to
     * @param value The amount to transfer
     * @param validAfter The time after which this is valid
     * @param validBefore The time before which this is valid
     * @param nonce Unique nonce
     * @param v Recovery ID
     * @param r Signature component
     * @param s Signature component
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp > validAfter, "Authorization not yet valid");
        require(block.timestamp < validBefore, "Authorization expired");
        require(!_authorizationStates[from][nonce], "Authorization already used");

        bytes32 hash = keccak256(
            abi.encodePacked(
                "\x19Ethereum Signed Message:\n32",
                keccak256(
                    abi.encodePacked(
                        from,
                        to,
                        value,
                        validAfter,
                        validBefore,
                        nonce,
                        address(this)
                    )
                )
            )
        );

        address signer = hash.recover(v, r, s);
        require(signer == from, "Invalid signature");

        _authorizationStates[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @dev Cancel authorization
     * @param authorizer The address that signed the authorization
     * @param nonce The nonce that was used to generate the authorization
     */
    function cancelAuthorization(address authorizer, bytes32 nonce) external {
        require(!_authorizationStates[authorizer][nonce], "Authorization already used");
        _authorizationStates[authorizer][nonce] = true;
        emit AuthorizationCanceled(authorizer, nonce);
    }

    /**
     * @dev Check if authorization is used
     * @param authorizer The address that signed the authorization
     * @param nonce The nonce that was used to generate the authorization
     * @return True if authorization is used
     */
    function authorizationState(address authorizer, bytes32 nonce) external view returns (bool) {
        return _authorizationStates[authorizer][nonce];
    }

    /**
     * @dev Mint tokens (only owner)
     * @param to The address to mint to
     * @param amount The amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Get weather API access price
     * @return The price in wei
     */
    function getWeatherApiPrice() external pure returns (uint256) {
        return WEATHER_API_PRICE;
    }

    /**
     * @dev Check if user has sufficient balance for weather API access
     * @param user The user address
     * @return True if user has sufficient balance
     */
    function hasWeatherApiAccess(address user) external view returns (bool) {
        return balanceOf(user) >= WEATHER_API_PRICE;
    }
}
