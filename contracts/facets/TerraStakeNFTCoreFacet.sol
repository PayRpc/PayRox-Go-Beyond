// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/LibDiamond.sol";

/**
 * @title TerraStakeNFTCoreFacet
 * @notice PayRox Diamond Architecture - Core NFT functionality with manifest-based routing
 * @dev 💎 PayRox Diamond Facet with isolated storage and LibDiamond integration
 * 
 * PayRox Features:
 * - Isolated storage: payrox.facet.storage.terrastakentcore.v1
 * - Manifest routing: All calls via dispatcher
 * - Access control: Via PayRox dispatcher roles
 * - Deployment: CREATE2 content-addressed
 * 
 * 🧠 AI-Generated using PayRox Diamond Learning Patterns
 */
contract TerraStakeNFTCoreFacet {
    using LibDiamond for LibDiamond.DiamondStorage;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS - Token Types
    // ═══════════════════════════════════════════════════════════════════════════

    uint256 private constant TERRA_BASIC = 1;
    uint256 private constant TERRA_PREMIUM = 2;
    uint256 private constant TERRA_LEGENDARY = 3;
    uint256 private constant TERRA_MYTHIC = 4;

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE - ISOLATED FROM OTHER FACETS (PayRox Diamond Pattern)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @dev PayRox isolated storage slot: payrox.facet.storage.terrastakentcore.v1
    bytes32 private constant STORAGE_POSITION = 
        keccak256("payrox.facet.storage.terrastakentcore.v1");

    struct TerraStakeNFTCoreStorage {
        // ERC1155 Core State
        mapping(uint256 => uint256) tokenSupply;
        mapping(uint256 => uint256) maxTokenSupply;
        mapping(uint256 => string) tokenURIs;
        mapping(uint256 => mapping(address => uint256)) balances;
        mapping(address => mapping(address => bool)) operatorApprovals;
        
        // Token type tracking (constants defined separately)
        bool _tokenTypesInitialized;
        
        // Core NFT Configuration
        string baseURI;
        bool initialized;
        
        // PayRox Diamond specific
        address manifestDispatcher;
        
        // Reserved slots for future upgrades
        uint256[50] reserved;
    }

    function terraStakeNFTCoreStorage() internal pure returns (TerraStakeNFTCoreStorage storage ds) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS - PayRox Diamond Compatible
    // ═══════════════════════════════════════════════════════════════════════════

    event TokenMinted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 amount,
        uint256 indexed mintType
    );

    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );

    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );

    event ApprovalForAll(
        address indexed account,
        address indexed operator,
        bool approved
    );

    event URI(string value, uint256 indexed id);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS - Gas Efficient Custom Errors
    // ═══════════════════════════════════════════════════════════════════════════

    error TerraStakeNFTCore__Unauthorized();
    error TerraStakeNFTCore__InvalidTokenId(uint256 tokenId);
    error TerraStakeNFTCore__InsufficientBalance(address account, uint256 tokenId, uint256 required, uint256 available);
    error TerraStakeNFTCore__InsufficientSupply(uint256 requested, uint256 available);
    error TerraStakeNFTCore__InvalidAmount(uint256 amount);
    error TerraStakeNFTCore__NotApproved(address operator, address account);
    error TerraStakeNFTCore__AlreadyInitialized();
    error TerraStakeNFTCore__ArrayLengthMismatch();

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION - PayRox Diamond Pattern
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initialize TerraStakeNFTCoreFacet with PayRox Diamond integration
     * @param manifestDispatcher The PayRox manifest dispatcher address
     * @param baseURI_ Base URI for token metadata
     */
    function initializeTerraStakeNFTCore(
        address manifestDispatcher,
        string memory baseURI_
    ) external {
        LibDiamond.initializeDiamond(manifestDispatcher);
        
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        if (ds.initialized) revert TerraStakeNFTCore__AlreadyInitialized();
        
        ds.manifestDispatcher = manifestDispatcher;
        ds.baseURI = baseURI_;
        ds.initialized = true;
        
        // Initialize token configurations with PayRox patterns
        _initializeTokenConfigs();
    }

    /**
     * @dev Initialize token configurations following PayRox patterns
     */
    function _initializeTokenConfigs() private {
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        
        // Set maximum supplies for each token type (AI-optimized distribution)
        ds.maxTokenSupply[1] = 1000000;     // TERRA_BASIC - 1M tokens
        ds.maxTokenSupply[2] = 100000;      // TERRA_PREMIUM - 100K tokens  
        ds.maxTokenSupply[3] = 10000;       // TERRA_LEGENDARY - 10K tokens
        ds.maxTokenSupply[4] = 1000;        // TERRA_MYTHIC - 1K tokens
        
        // Set token URIs with PayRox compatible naming
        ds.tokenURIs[1] = "terra-basic.json";
        ds.tokenURIs[2] = "terra-premium.json";
        ds.tokenURIs[3] = "terra-legendary.json";
        ds.tokenURIs[4] = "terra-mythic.json";
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL - Via PayRox Manifest Dispatcher
    // ═══════════════════════════════════════════════════════════════════════════

    modifier onlyManifestDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }

    modifier onlyMinterRole() {
        LibDiamond.requireRole(keccak256("MINTER_ROLE"));
        _;
    }

    modifier onlyValidTokenId(uint256 tokenId) {
        if (tokenId == 0 || tokenId > 4) {
            revert TerraStakeNFTCore__InvalidTokenId(tokenId);
        }
        _;
    }

    modifier onlyPositiveAmount(uint256 amount) {
        if (amount == 0) {
            revert TerraStakeNFTCore__InvalidAmount(amount);
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CORE NFT FUNCTIONS - PayRox Diamond Facet Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Mint environmental NFTs with PayRox Diamond routing
     * @param to Address to mint tokens to
     * @param tokenId Type of token to mint (1-4)
     * @param amount Amount of tokens to mint
     * @param data Additional data for the mint
     */
    function mintNFT(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external 
        onlyManifestDispatcher 
        onlyMinterRole 
        onlyValidTokenId(tokenId) 
        onlyPositiveAmount(amount) 
    {
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        
        // Check supply limits
        uint256 newSupply = ds.tokenSupply[tokenId] + amount;
        if (newSupply > ds.maxTokenSupply[tokenId]) {
            revert TerraStakeNFTCore__InsufficientSupply(
                amount, 
                ds.maxTokenSupply[tokenId] - ds.tokenSupply[tokenId]
            );
        }
        
        // Update state
        ds.tokenSupply[tokenId] += amount;
        ds.balances[tokenId][to] += amount;
        
        emit TokenMinted(to, tokenId, amount, tokenId);
        emit TransferSingle(msg.sender, address(0), to, tokenId, amount);
        
        // Handle receiver callback if contract
        _doSafeTransferAcceptanceCheck(msg.sender, address(0), to, tokenId, amount, data);
    }

    /**
     * @notice Burn NFT tokens with PayRox Diamond routing
     * @param from Address to burn tokens from
     * @param tokenId Token type to burn
     * @param amount Amount to burn
     */
    function burnNFT(
        address from,
        uint256 tokenId,
        uint256 amount
    ) external 
        onlyManifestDispatcher 
        onlyValidTokenId(tokenId) 
        onlyPositiveAmount(amount) 
    {
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        
        // Check approval
        if (from != msg.sender && !ds.operatorApprovals[from][msg.sender]) {
            revert TerraStakeNFTCore__NotApproved(msg.sender, from);
        }
        
        uint256 currentBalance = ds.balances[tokenId][from];
        if (currentBalance < amount) {
            revert TerraStakeNFTCore__InsufficientBalance(from, tokenId, amount, currentBalance);
        }
        
        // Update state
        ds.balances[tokenId][from] -= amount;
        ds.tokenSupply[tokenId] -= amount;
        
        emit TransferSingle(msg.sender, from, address(0), tokenId, amount);
    }

    /**
     * @notice Transfer NFT tokens with PayRox Diamond routing
     * @param from Source address
     * @param to Destination address
     * @param tokenId Token type to transfer
     * @param amount Amount to transfer
     * @param data Additional data
     */
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external onlyManifestDispatcher {
        _safeTransferFrom(from, to, tokenId, amount, data);
    }

    /**
     * @notice Batch transfer NFT tokens with PayRox Diamond routing
     * @param from Source address
     * @param to Destination address
     * @param ids Array of token IDs
     * @param amounts Array of amounts
     * @param data Additional data
     */
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyManifestDispatcher {
        if (ids.length != amounts.length) {
            revert TerraStakeNFTCore__ArrayLengthMismatch();
        }
        
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        
        // Check approval
        if (from != msg.sender && !ds.operatorApprovals[from][msg.sender]) {
            revert TerraStakeNFTCore__NotApproved(msg.sender, from);
        }
        
        for (uint256 i = 0; i < ids.length; ) {
            uint256 tokenId = ids[i];
            uint256 amount = amounts[i];
            
            uint256 currentBalance = ds.balances[tokenId][from];
            if (currentBalance < amount) {
                revert TerraStakeNFTCore__InsufficientBalance(from, tokenId, amount, currentBalance);
            }
            
            ds.balances[tokenId][from] -= amount;
            ds.balances[tokenId][to] += amount;
            
            unchecked { ++i; }
        }
        
        emit TransferBatch(msg.sender, from, to, ids, amounts);
        
        _doSafeBatchTransferAcceptanceCheck(msg.sender, from, to, ids, amounts, data);
    }

    /**
     * @notice Set operator approval for all tokens
     * @param operator Address to approve/revoke
     * @param approved Whether to approve or revoke
     */
    function setApprovalForAll(address operator, bool approved) external onlyManifestDispatcher {
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        ds.operatorApprovals[msg.sender][operator] = approved;
        
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS - PayRox Diamond Gas Optimized
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get token balance for account and token ID
     * @param account Account to check
     * @param tokenId Token ID to check
     * @return Token balance
     */
    function balanceOf(address account, uint256 tokenId) external view returns (uint256) {
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        return ds.balances[tokenId][account];
    }

    /**
     * @notice Get token balances for multiple accounts and token IDs
     * @param accounts Array of accounts
     * @param ids Array of token IDs
     * @return Array of balances
     */
    function balanceOfBatch(
        address[] memory accounts,
        uint256[] memory ids
    ) external view returns (uint256[] memory) {
        if (accounts.length != ids.length) {
            revert TerraStakeNFTCore__ArrayLengthMismatch();
        }
        
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        uint256[] memory batchBalances = new uint256[](accounts.length);
        
        for (uint256 i = 0; i < accounts.length; ) {
            batchBalances[i] = ds.balances[ids[i]][accounts[i]];
            unchecked { ++i; }
        }
        
        return batchBalances;
    }

    /**
     * @notice Check if operator is approved for all tokens
     * @param account Token owner
     * @param operator Potential operator
     * @return Whether operator is approved
     */
    function isApprovedForAll(address account, address operator) external view returns (bool) {
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        return ds.operatorApprovals[account][operator];
    }

    /**
     * @notice Get URI for token type
     * @param tokenId Token type
     * @return Token URI
     */
    function uri(uint256 tokenId) external view onlyValidTokenId(tokenId) returns (string memory) {
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        return string(abi.encodePacked(ds.baseURI, ds.tokenURIs[tokenId]));
    }

    /**
     * @notice Get current token supply
     * @param tokenId Token type
     * @return Current supply
     */
    function getTokenSupply(uint256 tokenId) external view onlyValidTokenId(tokenId) returns (uint256) {
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        return ds.tokenSupply[tokenId];
    }

    /**
     * @notice Get maximum token supply
     * @param tokenId Token type
     * @return Maximum supply
     */
    function getMaxTokenSupply(uint256 tokenId) external view onlyValidTokenId(tokenId) returns (uint256) {
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        return ds.maxTokenSupply[tokenId];
    }

    /**
     * @notice Check if interface is supported (ERC165)
     * @param interfaceId Interface ID to check
     * @return Whether interface is supported
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC165
            interfaceId == 0xd9b67a26 || // ERC1155
            interfaceId == 0x0e89341c;   // ERC1155MetadataURI
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS - PayRox Diamond Helper Functions
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @dev Internal transfer function with PayRox Diamond patterns
     */
    function _safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) internal onlyValidTokenId(tokenId) onlyPositiveAmount(amount) {
        TerraStakeNFTCoreStorage storage ds = terraStakeNFTCoreStorage();
        
        // Check approval
        if (from != msg.sender && !ds.operatorApprovals[from][msg.sender]) {
            revert TerraStakeNFTCore__NotApproved(msg.sender, from);
        }
        
        uint256 currentBalance = ds.balances[tokenId][from];
        if (currentBalance < amount) {
            revert TerraStakeNFTCore__InsufficientBalance(from, tokenId, amount, currentBalance);
        }
        
        // Update balances
        ds.balances[tokenId][from] -= amount;
        ds.balances[tokenId][to] += amount;
        
        emit TransferSingle(msg.sender, from, to, tokenId, amount);
        
        _doSafeTransferAcceptanceCheck(msg.sender, from, to, tokenId, amount, data);
    }

    /**
     * @dev Handle receiver callback for single transfer
     */
    function _doSafeTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) private {
        if (to.code.length > 0) {
            try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (bytes4 response) {
                if (response != IERC1155Receiver.onERC1155Received.selector) {
                    revert("ERC1155: ERC1155Receiver rejected tokens");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("ERC1155: transfer to non-ERC1155Receiver implementer");
            }
        }
    }

    /**
     * @dev Handle receiver callback for batch transfer
     */
    function _doSafeBatchTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) private {
        if (to.code.length > 0) {
            try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, amounts, data) returns (bytes4 response) {
                if (response != IERC1155Receiver.onERC1155BatchReceived.selector) {
                    revert("ERC1155: ERC1155Receiver rejected tokens");
                }
            } catch Error(string memory reason) {
                revert(reason);
            } catch {
                revert("ERC1155: transfer to non-ERC1155Receiver implementer");
            }
        }
    }
}

/**
 * @dev Required interface for ERC1155 receiver contracts
 */
interface IERC1155Receiver {
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}
