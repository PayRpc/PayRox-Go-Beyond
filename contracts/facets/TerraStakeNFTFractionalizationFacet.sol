// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/LibDiamond.sol";

/**
 * @title TerraStakeNFTFractionalizationFacet
 * @notice PayRox Diamond Architecture - NFT Fractionalization and shared ownership with manifest-based routing
 * @dev 💎 PayRox Diamond Facet with isolated storage and LibDiamond integration
 * 
 * PayRox Features:
 * - Isolated storage: payrox.facet.storage.terrastakentfract.v1
 * - Manifest routing: All calls via dispatcher
 * - Access control: Via PayRox dispatcher roles
 * - Deployment: CREATE2 content-addressed
 * 
 * 🧠 AI-Generated using PayRox Diamond Learning Patterns
 */
contract TerraStakeNFTFractionalizationFacet {
    using LibDiamond for LibDiamond.DiamondStorage;

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE - ISOLATED FROM OTHER FACETS (PayRox Diamond Pattern)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @dev PayRox isolated storage slot: payrox.facet.storage.terrastakentfract.v1
    bytes32 private constant STORAGE_POSITION = 
        keccak256("payrox.facet.storage.terrastakentfract.v1");

    struct FractionalizedToken {
        uint256 originalTokenId;     // Original NFT token ID
        uint256 originalAmount;      // Original amount fractioned
        uint256 totalFractions;      // Total number of fractions created
        uint256 fractionPrice;       // Price per fraction
        address originalOwner;       // Original token owner
        uint256 creationTime;        // When fractionalization was created
        bool active;                 // Whether fractionalization is active
        bool redeemable;             // Whether token can be redeemed
        string name;                 // Fraction token name
        string symbol;               // Fraction token symbol
    }

    struct FractionOwnership {
        uint256 fractionTokenId;     // Fraction token ID
        address owner;               // Fraction owner
        uint256 amount;              // Amount of fractions owned
        uint256 acquisitionTime;     // When fractions were acquired
        uint256 lastDividendClaim;   // Last dividend claim time
        bool votingRights;           // Whether owner has voting rights
    }

    struct RedemptionProposal {
        uint256 proposalId;          // Unique proposal ID
        uint256 fractionTokenId;     // Target fraction token
        address proposer;            // Who proposed redemption
        uint256 proposalTime;        // When proposal was made
        uint256 endTime;             // When voting ends
        uint256 requiredVotes;       // Votes needed to pass
        uint256 currentVotes;        // Current votes received
        mapping(address => bool) hasVoted;  // Voter tracking
        mapping(address => uint256) voteWeights; // Vote weights
        bool executed;               // Whether proposal was executed
        bool passed;                 // Whether proposal passed
    }

    struct TerraStakeNFTFractionalizationStorage {
        // Fractionalization mappings
        mapping(uint256 => FractionalizedToken) fractionalizedTokens;    // fractionTokenId => token
        mapping(uint256 => mapping(address => FractionOwnership)) fractionOwnerships; // fractionTokenId => owner => ownership
        mapping(uint256 => address[]) fractionHolders;                   // fractionTokenId => holders[]
        mapping(address => uint256[]) userFractionTokens;                // user => fractionTokenIds[]
        
        // Redemption system
        mapping(uint256 => RedemptionProposal) redemptionProposals;      // proposalId => proposal
        mapping(uint256 => uint256[]) tokenRedemptionProposals;          // fractionTokenId => proposalIds[]
        
        // Dividend system
        mapping(uint256 => uint256) fractionDividends;                   // fractionTokenId => total dividends
        mapping(uint256 => mapping(address => uint256)) userDividendClaims; // fractionTokenId => user => claimed
        mapping(uint256 => uint256) lastDividendDistribution;            // fractionTokenId => timestamp
        
        // Global state
        uint256 globalFractionTokenId;
        uint256 globalProposalId;
        uint256 totalFractionalizedTokens;
        uint256 totalFractionHolders;
        
        // Configuration
        uint256 minFractionAmount;          // Minimum fractions to create
        uint256 maxFractionAmount;          // Maximum fractions per token
        uint256 fractionalizationFee;       // Fee for fractionalization (basis points)
        uint256 redemptionThreshold;        // Percentage needed for redemption (basis points)
        uint256 votingPeriod;               // Voting period for proposals (seconds)
        bool fractionalizationEnabled;
        
        // PayRox Diamond specific
        address manifestDispatcher;
        bool initialized;
        
        // Reserved slots for future upgrades
        uint256[50] reserved;
    }

    function terraStakeNFTFractionalizationStorage() internal pure returns (TerraStakeNFTFractionalizationStorage storage ds) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS - PayRox Diamond Compatible
    // ═══════════════════════════════════════════════════════════════════════════

    event TokenFractionalized(
        uint256 indexed originalTokenId,
        uint256 indexed fractionTokenId,
        address indexed owner,
        uint256 totalFractions,
        uint256 fractionPrice,
        string name,
        string symbol
    );

    event FractionsTransferred(
        uint256 indexed fractionTokenId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    event FractionsPurchased(
        uint256 indexed fractionTokenId,
        address indexed buyer,
        uint256 amount,
        uint256 totalCost,
        uint256 timestamp
    );

    event RedemptionProposed(
        uint256 indexed proposalId,
        uint256 indexed fractionTokenId,
        address indexed proposer,
        uint256 endTime,
        uint256 requiredVotes
    );

    event RedemptionVote(
        uint256 indexed proposalId,
        address indexed voter,
        uint256 voteWeight,
        uint256 timestamp
    );

    event TokenRedeemed(
        uint256 indexed fractionTokenId,
        uint256 indexed proposalId,
        address indexed redeemer,
        uint256 totalVotes,
        uint256 timestamp
    );

    event DividendsDistributed(
        uint256 indexed fractionTokenId,
        uint256 totalAmount,
        uint256 perFraction,
        uint256 timestamp
    );

    event DividendsClaimed(
        address indexed user,
        uint256 indexed fractionTokenId,
        uint256 amount,
        uint256 timestamp
    );

    event FractionalizationConfigUpdated(
        uint256 minFractionAmount,
        uint256 maxFractionAmount,
        uint256 fractionalizationFee,
        uint256 redemptionThreshold
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS - Gas Efficient Custom Errors
    // ═══════════════════════════════════════════════════════════════════════════

    error TerraStakeNFTFractionalization__Unauthorized();
    error TerraStakeNFTFractionalization__FractionalizationDisabled();
    error TerraStakeNFTFractionalization__InvalidTokenId(uint256 tokenId);
    error TerraStakeNFTFractionalization__InvalidFractionTokenId(uint256 fractionTokenId);
    error TerraStakeNFTFractionalization__InvalidProposalId(uint256 proposalId);
    error TerraStakeNFTFractionalization__InsufficientBalance(uint256 required, uint256 available);
    error TerraStakeNFTFractionalization__InsufficientFractions(uint256 amount);
    error TerraStakeNFTFractionalization__TokenAlreadyFractionalized(uint256 tokenId);
    error TerraStakeNFTFractionalization__NotTokenOwner(uint256 tokenId);
    error TerraStakeNFTFractionalization__NotFractionOwner(uint256 fractionTokenId);
    error TerraStakeNFTFractionalization__ProposalNotActive(uint256 proposalId);
    error TerraStakeNFTFractionalization__ProposalExpired(uint256 proposalId);
    error TerraStakeNFTFractionalization__AlreadyVoted(uint256 proposalId);
    error TerraStakeNFTFractionalization__RedemptionThresholdNotMet(uint256 current, uint256 required);
    error TerraStakeNFTFractionalization__NoVotingRights(address voter);
    error TerraStakeNFTFractionalization__AlreadyInitialized();
    error TerraStakeNFTFractionalization__InvalidAmount(uint256 amount);
    error TerraStakeNFTFractionalization__FractionAmountOutOfRange(uint256 amount, uint256 min, uint256 max);

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION - PayRox Diamond Pattern
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initialize TerraStakeNFTFractionalizationFacet with PayRox Diamond integration
     * @param manifestDispatcher The PayRox manifest dispatcher address
     */
    function initializeTerraStakeNFTFractionalization(address manifestDispatcher) external {
        LibDiamond.initializeDiamond(manifestDispatcher);
        
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        if (ds.initialized) revert TerraStakeNFTFractionalization__AlreadyInitialized();
        
        ds.manifestDispatcher = manifestDispatcher;
        ds.fractionalizationEnabled = true;
        ds.minFractionAmount = 100;        // Minimum 100 fractions
        ds.maxFractionAmount = 10000;      // Maximum 10,000 fractions
        ds.fractionalizationFee = 250;     // 2.5% fee
        ds.redemptionThreshold = 6700;     // 67% threshold for redemption
        ds.votingPeriod = 7 days;          // 1 week voting period
        ds.initialized = true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL - Via PayRox Manifest Dispatcher
    // ═══════════════════════════════════════════════════════════════════════════

    modifier onlyManifestDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }

    modifier onlyFractionalizationManager() {
        LibDiamond.requireRole(keccak256("FRACTIONALIZATION_MANAGER_ROLE"));
        _;
    }

    modifier whenFractionalizationEnabled() {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        if (!ds.fractionalizationEnabled) revert TerraStakeNFTFractionalization__FractionalizationDisabled();
        _;
    }

    modifier onlyValidTokenId(uint256 tokenId) {
        if (tokenId == 0 || tokenId > 4) {
            revert TerraStakeNFTFractionalization__InvalidTokenId(tokenId);
        }
        _;
    }

    modifier onlyPositiveAmount(uint256 amount) {
        if (amount == 0) {
            revert TerraStakeNFTFractionalization__InvalidAmount(amount);
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FRACTIONALIZATION FUNCTIONS - PayRox Diamond Facet Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Fractionalize an NFT token into smaller ownership shares
     * @param tokenId Original token ID to fractionalize
     * @param amount Amount of tokens to fractionalize
     * @param totalFractions Total number of fractions to create
     * @param fractionPrice Price per fraction
     * @param name Name for the fraction token
     * @param symbol Symbol for the fraction token
     * @return fractionTokenId Unique identifier for fractionalized token
     */
    function fractionalizeToken(
        uint256 tokenId,
        uint256 amount,
        uint256 totalFractions,
        uint256 fractionPrice,
        string memory name,
        string memory symbol
    ) external 
        onlyManifestDispatcher
        whenFractionalizationEnabled
        onlyValidTokenId(tokenId)
        onlyPositiveAmount(amount)
        onlyPositiveAmount(totalFractions)
        returns (uint256 fractionTokenId)
    {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        
        // Validate fraction amount
        if (totalFractions < ds.minFractionAmount || totalFractions > ds.maxFractionAmount) {
            revert TerraStakeNFTFractionalization__FractionAmountOutOfRange(
                totalFractions,
                ds.minFractionAmount,
                ds.maxFractionAmount
            );
        }
        
        // Check token ownership via Core facet (assumed to be validated externally)
        // Transfer original tokens to this contract (via Core facet)
        
        // Create fractionalized token
        fractionTokenId = ds.globalFractionTokenId++;
        uint256 currentTime = block.timestamp;
        
        ds.fractionalizedTokens[fractionTokenId] = FractionalizedToken({
            originalTokenId: tokenId,
            originalAmount: amount,
            totalFractions: totalFractions,
            fractionPrice: fractionPrice,
            originalOwner: msg.sender,
            creationTime: currentTime,
            active: true,
            redeemable: true,
            name: name,
            symbol: symbol
        });
        
        // Grant all fractions to original owner initially
        ds.fractionOwnerships[fractionTokenId][msg.sender] = FractionOwnership({
            fractionTokenId: fractionTokenId,
            owner: msg.sender,
            amount: totalFractions,
            acquisitionTime: currentTime,
            lastDividendClaim: currentTime,
            votingRights: true
        });
        
        // Update mappings
        ds.fractionHolders[fractionTokenId].push(msg.sender);
        ds.userFractionTokens[msg.sender].push(fractionTokenId);
        ds.totalFractionalizedTokens++;
        ds.totalFractionHolders++;
        
        emit TokenFractionalized(
            tokenId,
            fractionTokenId,
            msg.sender,
            totalFractions,
            fractionPrice,
            name,
            symbol
        );
        
        return fractionTokenId;
    }

    /**
     * @notice Purchase fractions of a fractionalized token
     * @param fractionTokenId Fraction token ID
     * @param amount Number of fractions to purchase
     */
    function purchaseFractions(
        uint256 fractionTokenId,
        uint256 amount
    ) external onlyManifestDispatcher whenFractionalizationEnabled onlyPositiveAmount(amount) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        FractionalizedToken storage token = ds.fractionalizedTokens[fractionTokenId];
        
        if (!token.active) {
            revert TerraStakeNFTFractionalization__InvalidFractionTokenId(fractionTokenId);
        }
        
        // Calculate total cost
        uint256 totalCost = amount * token.fractionPrice;
        
        // Transfer payment from buyer (handled via Core facet)
        // Find seller with available fractions (for simplicity, using original owner)
        address seller = token.originalOwner;
        FractionOwnership storage sellerOwnership = ds.fractionOwnerships[fractionTokenId][seller];
        
        if (sellerOwnership.amount < amount) {
            revert TerraStakeNFTFractionalization__InsufficientFractions(amount);
        }
        
        // Transfer fractions
        _transferFractions(fractionTokenId, seller, msg.sender, amount);
        
        emit FractionsPurchased(fractionTokenId, msg.sender, amount, totalCost, block.timestamp);
    }

    /**
     * @notice Transfer fractions between addresses
     * @param fractionTokenId Fraction token ID
     * @param to Recipient address
     * @param amount Number of fractions to transfer
     */
    function transferFractions(
        uint256 fractionTokenId,
        address to,
        uint256 amount
    ) external onlyManifestDispatcher whenFractionalizationEnabled onlyPositiveAmount(amount) {
        _transferFractions(fractionTokenId, msg.sender, to, amount);
    }

    /**
     * @dev Internal function to transfer fractions
     * @param fractionTokenId Fraction token ID
     * @param from Sender address
     * @param to Recipient address
     * @param amount Number of fractions to transfer
     */
    function _transferFractions(
        uint256 fractionTokenId,
        address from,
        address to,
        uint256 amount
    ) internal {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        FractionOwnership storage fromOwnership = ds.fractionOwnerships[fractionTokenId][from];
        
        if (fromOwnership.amount < amount) {
            revert TerraStakeNFTFractionalization__InsufficientFractions(amount);
        }
        
        // Update sender
        fromOwnership.amount -= amount;
        if (fromOwnership.amount == 0) {
            fromOwnership.votingRights = false;
            _removeFractionHolder(fractionTokenId, from);
        }
        
        // Update recipient
        FractionOwnership storage toOwnership = ds.fractionOwnerships[fractionTokenId][to];
        if (toOwnership.amount == 0) {
            // New fraction holder
            toOwnership.fractionTokenId = fractionTokenId;
            toOwnership.owner = to;
            toOwnership.acquisitionTime = block.timestamp;
            toOwnership.lastDividendClaim = block.timestamp;
            toOwnership.votingRights = true;
            
            ds.fractionHolders[fractionTokenId].push(to);
            ds.userFractionTokens[to].push(fractionTokenId);
            ds.totalFractionHolders++;
        }
        
        toOwnership.amount += amount;
        
        emit FractionsTransferred(fractionTokenId, from, to, amount, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REDEMPTION FUNCTIONS - PayRox Diamond Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Propose redemption of fractionalized token
     * @param fractionTokenId Fraction token ID to redeem
     * @return proposalId Unique proposal identifier
     */
    function proposeRedemption(
        uint256 fractionTokenId
    ) external onlyManifestDispatcher whenFractionalizationEnabled returns (uint256 proposalId) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        FractionalizedToken storage token = ds.fractionalizedTokens[fractionTokenId];
        
        if (!token.active || !token.redeemable) {
            revert TerraStakeNFTFractionalization__InvalidFractionTokenId(fractionTokenId);
        }
        
        FractionOwnership storage ownership = ds.fractionOwnerships[fractionTokenId][msg.sender];
        if (ownership.amount == 0 || !ownership.votingRights) {
            revert TerraStakeNFTFractionalization__NoVotingRights(msg.sender);
        }
        
        // Create redemption proposal
        proposalId = ds.globalProposalId++;
        uint256 currentTime = block.timestamp;
        uint256 endTime = currentTime + ds.votingPeriod;
        uint256 requiredVotes = (token.totalFractions * ds.redemptionThreshold) / 10000;
        
        RedemptionProposal storage proposal = ds.redemptionProposals[proposalId];
        proposal.proposalId = proposalId;
        proposal.fractionTokenId = fractionTokenId;
        proposal.proposer = msg.sender;
        proposal.proposalTime = currentTime;
        proposal.endTime = endTime;
        proposal.requiredVotes = requiredVotes;
        proposal.currentVotes = 0;
        proposal.executed = false;
        proposal.passed = false;
        
        // Add to token proposals
        ds.tokenRedemptionProposals[fractionTokenId].push(proposalId);
        
        emit RedemptionProposed(proposalId, fractionTokenId, msg.sender, endTime, requiredVotes);
        
        return proposalId;
    }

    /**
     * @notice Vote on redemption proposal
     * @param proposalId Proposal ID to vote on
     */
    function voteOnRedemption(uint256 proposalId) external onlyManifestDispatcher {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        RedemptionProposal storage proposal = ds.redemptionProposals[proposalId];
        
        if (proposal.proposalId == 0) {
            revert TerraStakeNFTFractionalization__InvalidProposalId(proposalId);
        }
        
        if (block.timestamp > proposal.endTime) {
            revert TerraStakeNFTFractionalization__ProposalExpired(proposalId);
        }
        
        if (proposal.executed) {
            revert TerraStakeNFTFractionalization__ProposalNotActive(proposalId);
        }
        
        if (proposal.hasVoted[msg.sender]) {
            revert TerraStakeNFTFractionalization__AlreadyVoted(proposalId);
        }
        
        // Check voting rights
        FractionOwnership storage ownership = ds.fractionOwnerships[proposal.fractionTokenId][msg.sender];
        if (ownership.amount == 0 || !ownership.votingRights) {
            revert TerraStakeNFTFractionalization__NoVotingRights(msg.sender);
        }
        
        // Record vote
        uint256 voteWeight = ownership.amount;
        proposal.hasVoted[msg.sender] = true;
        proposal.voteWeights[msg.sender] = voteWeight;
        proposal.currentVotes += voteWeight;
        
        emit RedemptionVote(proposalId, msg.sender, voteWeight, block.timestamp);
        
        // Check if proposal passes
        if (proposal.currentVotes >= proposal.requiredVotes) {
            proposal.passed = true;
        }
    }

    /**
     * @notice Execute redemption proposal if it passed
     * @param proposalId Proposal ID to execute
     */
    function executeRedemption(uint256 proposalId) external onlyManifestDispatcher {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        RedemptionProposal storage proposal = ds.redemptionProposals[proposalId];
        
        if (proposal.proposalId == 0) {
            revert TerraStakeNFTFractionalization__InvalidProposalId(proposalId);
        }
        
        if (proposal.executed) {
            revert TerraStakeNFTFractionalization__ProposalNotActive(proposalId);
        }
        
        if (block.timestamp <= proposal.endTime && !proposal.passed) {
            revert TerraStakeNFTFractionalization__RedemptionThresholdNotMet(
                proposal.currentVotes,
                proposal.requiredVotes
            );
        }
        
        if (!proposal.passed) {
            revert TerraStakeNFTFractionalization__RedemptionThresholdNotMet(
                proposal.currentVotes,
                proposal.requiredVotes
            );
        }
        
        // Execute redemption
        proposal.executed = true;
        FractionalizedToken storage token = ds.fractionalizedTokens[proposal.fractionTokenId];
        token.active = false;
        
        // Transfer original tokens back to proposer (via Core facet)
        // Burn all fraction tokens
        
        emit TokenRedeemed(
            proposal.fractionTokenId,
            proposalId,
            proposal.proposer,
            proposal.currentVotes,
            block.timestamp
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DIVIDEND FUNCTIONS - PayRox Diamond Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Distribute dividends to fraction holders
     * @param fractionTokenId Fraction token ID
     * @param totalAmount Total dividend amount to distribute
     */
    function distributeDividends(
        uint256 fractionTokenId,
        uint256 totalAmount
    ) external onlyManifestDispatcher onlyFractionalizationManager onlyPositiveAmount(totalAmount) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        FractionalizedToken storage token = ds.fractionalizedTokens[fractionTokenId];
        
        if (!token.active) {
            revert TerraStakeNFTFractionalization__InvalidFractionTokenId(fractionTokenId);
        }
        
        // Calculate per-fraction dividend
        uint256 perFraction = totalAmount / token.totalFractions;
        
        ds.fractionDividends[fractionTokenId] += totalAmount;
        ds.lastDividendDistribution[fractionTokenId] = block.timestamp;
        
        emit DividendsDistributed(fractionTokenId, totalAmount, perFraction, block.timestamp);
    }

    /**
     * @notice Claim dividends for fraction ownership
     * @param fractionTokenId Fraction token ID
     */
    function claimDividends(uint256 fractionTokenId) external onlyManifestDispatcher {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        FractionOwnership storage ownership = ds.fractionOwnerships[fractionTokenId][msg.sender];
        
        if (ownership.amount == 0) {
            revert TerraStakeNFTFractionalization__NotFractionOwner(fractionTokenId);
        }
        
        // Calculate claimable dividends
        uint256 totalDividends = ds.fractionDividends[fractionTokenId];
        uint256 userClaimed = ds.userDividendClaims[fractionTokenId][msg.sender];
        uint256 perFraction = totalDividends / ds.fractionalizedTokens[fractionTokenId].totalFractions;
        uint256 claimableAmount = (ownership.amount * perFraction) - userClaimed;
        
        if (claimableAmount > 0) {
            ds.userDividendClaims[fractionTokenId][msg.sender] += claimableAmount;
            ownership.lastDividendClaim = block.timestamp;
            
            // Transfer dividends to user (via Core facet)
            
            emit DividendsClaimed(msg.sender, fractionTokenId, claimableAmount, block.timestamp);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - PayRox Diamond Management
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Update fractionalization configuration
     * @param minFractionAmount Minimum fraction amount
     * @param maxFractionAmount Maximum fraction amount
     * @param fractionalizationFee Fractionalization fee in basis points
     * @param redemptionThreshold Redemption threshold in basis points
     */
    function updateFractionalizationConfig(
        uint256 minFractionAmount,
        uint256 maxFractionAmount,
        uint256 fractionalizationFee,
        uint256 redemptionThreshold
    ) external onlyManifestDispatcher onlyFractionalizationManager {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        
        ds.minFractionAmount = minFractionAmount;
        ds.maxFractionAmount = maxFractionAmount;
        ds.fractionalizationFee = fractionalizationFee;
        ds.redemptionThreshold = redemptionThreshold;
        
        emit FractionalizationConfigUpdated(
            minFractionAmount,
            maxFractionAmount,
            fractionalizationFee,
            redemptionThreshold
        );
    }

    /**
     * @notice Set fractionalization enabled status
     * @param enabled Whether fractionalization is enabled
     */
    function setFractionalizationEnabled(bool enabled) external onlyManifestDispatcher onlyFractionalizationManager {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        ds.fractionalizationEnabled = enabled;
    }

    /**
     * @notice Set voting period for redemption proposals
     * @param period Voting period in seconds
     */
    function setVotingPeriod(uint256 period) external onlyManifestDispatcher onlyFractionalizationManager {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        ds.votingPeriod = period;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS - PayRox Diamond Gas Optimized
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get fractionalized token information
     * @param fractionTokenId Fraction token ID
     * @return Fractionalized token data
     */
    function getFractionalizedToken(uint256 fractionTokenId) external view returns (FractionalizedToken memory) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        return ds.fractionalizedTokens[fractionTokenId];
    }

    /**
     * @notice Get fraction ownership information
     * @param fractionTokenId Fraction token ID
     * @param owner Owner address
     * @return Fraction ownership data
     */
    function getFractionOwnership(uint256 fractionTokenId, address owner) external view returns (FractionOwnership memory) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        return ds.fractionOwnerships[fractionTokenId][owner];
    }

    /**
     * @notice Get fraction holders for a token
     * @param fractionTokenId Fraction token ID
     * @return Array of holder addresses
     */
    function getFractionHolders(uint256 fractionTokenId) external view returns (address[] memory) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        return ds.fractionHolders[fractionTokenId];
    }

    /**
     * @notice Get user's fraction tokens
     * @param user User address
     * @return Array of fraction token IDs
     */
    function getUserFractionTokens(address user) external view returns (uint256[] memory) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        return ds.userFractionTokens[user];
    }

    /**
     * @notice Get redemption proposal information
     * @param proposalId Proposal ID
     * @return Proposal data
     */
    function getRedemptionProposal(uint256 proposalId) external view returns (
        uint256 fractionTokenId,
        address proposer,
        uint256 proposalTime,
        uint256 endTime,
        uint256 requiredVotes,
        uint256 currentVotes,
        bool executed,
        bool passed
    ) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        RedemptionProposal storage proposal = ds.redemptionProposals[proposalId];
        
        return (
            proposal.fractionTokenId,
            proposal.proposer,
            proposal.proposalTime,
            proposal.endTime,
            proposal.requiredVotes,
            proposal.currentVotes,
            proposal.executed,
            proposal.passed
        );
    }

    /**
     * @notice Get claimable dividends for user
     * @param fractionTokenId Fraction token ID
     * @param user User address
     * @return Claimable dividend amount
     */
    function getClaimableDividends(uint256 fractionTokenId, address user) external view returns (uint256) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        FractionOwnership storage ownership = ds.fractionOwnerships[fractionTokenId][user];
        
        if (ownership.amount == 0) return 0;
        
        uint256 totalDividends = ds.fractionDividends[fractionTokenId];
        uint256 userClaimed = ds.userDividendClaims[fractionTokenId][user];
        uint256 perFraction = totalDividends / ds.fractionalizedTokens[fractionTokenId].totalFractions;
        
        return (ownership.amount * perFraction) - userClaimed;
    }

    /**
     * @notice Get fractionalization configuration
     * @return Configuration parameters
     */
    function getFractionalizationConfig() external view returns (
        uint256 minFractionAmount,
        uint256 maxFractionAmount,
        uint256 fractionalizationFee,
        uint256 redemptionThreshold,
        uint256 votingPeriod,
        bool fractionalizationEnabled
    ) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        return (
            ds.minFractionAmount,
            ds.maxFractionAmount,
            ds.fractionalizationFee,
            ds.redemptionThreshold,
            ds.votingPeriod,
            ds.fractionalizationEnabled
        );
    }

    /**
     * @notice Get global fractionalization statistics
     * @return Global statistics
     */
    function getGlobalFractionalizationStats() external view returns (
        uint256 totalFractionalizedTokens,
        uint256 totalFractionHolders,
        uint256 globalFractionTokenId,
        uint256 globalProposalId
    ) {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        return (
            ds.totalFractionalizedTokens,
            ds.totalFractionHolders,
            ds.globalFractionTokenId,
            ds.globalProposalId
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @dev Remove fraction holder from holders array
     * @param fractionTokenId Fraction token ID
     * @param holder Holder to remove
     */
    function _removeFractionHolder(uint256 fractionTokenId, address holder) internal {
        TerraStakeNFTFractionalizationStorage storage ds = terraStakeNFTFractionalizationStorage();
        address[] storage holders = ds.fractionHolders[fractionTokenId];
        
        for (uint256 i = 0; i < holders.length; i++) {
            if (holders[i] == holder) {
                holders[i] = holders[holders.length - 1];
                holders.pop();
                ds.totalFractionHolders--;
                break;
            }
        }
    }
}
