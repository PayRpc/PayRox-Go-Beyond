// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/LibDiamond.sol";

/**
 * @title TerraStakeNFTRandomnessFacet
 * @notice PayRox Diamond Architecture - VRF Randomness and lottery functionality with manifest-based routing
 * @dev 💎 PayRox Diamond Facet with isolated storage and LibDiamond integration
 * 
 * PayRox Features:
 * - Isolated storage: payrox.facet.storage.terrastakentrand.v1
 * - Manifest routing: All calls via dispatcher
 * - Access control: Via PayRox dispatcher roles
 * - Deployment: CREATE2 content-addressed
 * 
 * 🧠 AI-Generated using PayRox Diamond Learning Patterns
 */
contract TerraStakeNFTRandomnessFacet {
    using LibDiamond for LibDiamond.DiamondStorage;

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE - ISOLATED FROM OTHER FACETS (PayRox Diamond Pattern)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @dev PayRox isolated storage slot: payrox.facet.storage.terrastakentrand.v1
    bytes32 private constant STORAGE_POSITION = 
        keccak256("payrox.facet.storage.terrastakentrand.v1");

    struct RandomnessRequest {
        uint256 requestId;           // VRF request ID
        address requester;           // Address that requested randomness
        uint256 purpose;             // Purpose code (1=mint, 2=upgrade, 3=lottery, etc.)
        uint256 timestamp;           // When request was made
        uint256 seed;                // Additional seed for randomness
        bool fulfilled;              // Whether request has been fulfilled
        uint256 randomResult;        // Random number result
        bytes32 keyHash;             // VRF key hash used
        uint256 fee;                 // Fee paid for VRF request
    }

    struct LotteryRound {
        uint256 roundId;             // Lottery round ID
        uint256 startTime;           // Round start time
        uint256 endTime;             // Round end time
        uint256 entryFee;            // Entry fee in tokens
        uint256 totalEntries;        // Total number of entries
        uint256 prizePool;           // Total prize pool
        address[] participants;      // Array of participants
        mapping(address => uint256) userEntries; // User => number of entries
        bool active;                 // Whether round is active
        bool drawn;                  // Whether winner has been drawn
        address winner;              // Lottery winner
        uint256 winningNumber;       // Winning random number
        uint256 vrfRequestId;        // VRF request ID for drawing
    }

    struct RandomnessConfig {
        address vrfCoordinator;      // Chainlink VRF Coordinator
        bytes32 keyHash;             // VRF Key Hash
        uint256 fee;                 // VRF fee in LINK
        uint256 callbackGasLimit;    // Gas limit for VRF callback
        uint16 requestConfirmations; // Number of confirmations required
        uint32 numWords;             // Number of random words to request
    }

    struct TerraStakeNFTRandomnessStorage {
        // VRF and randomness
        mapping(uint256 => RandomnessRequest) randomnessRequests;     // requestId => request
        mapping(address => uint256[]) userRandomnessRequests;         // user => requestIds[]
        mapping(uint256 => uint256) purposeToLastRequestId;           // purpose => lastRequestId
        
        // Lottery system
        mapping(uint256 => LotteryRound) lotteryRounds;               // roundId => round
        mapping(address => uint256[]) userLotteryParticipation;       // user => roundIds[]
        
        // Randomness configuration
        RandomnessConfig vrfConfig;
        
        // Global state
        uint256 globalRequestId;
        uint256 globalLotteryRoundId;
        uint256 totalRandomnessRequests;
        bool randomnessEnabled;
        bool lotteryEnabled;
        
        // Randomness history for reproducibility
        mapping(bytes32 => uint256) randomnessSeedToResult;           // seed => result
        mapping(uint256 => bytes32) blockHashHistory;                 // blockNumber => blockHash
        
        // PayRox Diamond specific
        address manifestDispatcher;
        bool initialized;
        
        // Reserved slots for future upgrades
        uint256[50] reserved;
    }

    function terraStakeNFTRandomnessStorage() internal pure returns (TerraStakeNFTRandomnessStorage storage ds) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS - PayRox Diamond Compatible
    // ═══════════════════════════════════════════════════════════════════════════

    event RandomnessRequested(
        uint256 indexed requestId,
        address indexed requester,
        uint256 indexed purpose,
        uint256 seed,
        uint256 timestamp
    );

    event RandomnessFulfilled(
        uint256 indexed requestId,
        address indexed requester,
        uint256 randomResult,
        uint256 timestamp
    );

    event LotteryRoundStarted(
        uint256 indexed roundId,
        uint256 startTime,
        uint256 endTime,
        uint256 entryFee
    );

    event LotteryEntryAdded(
        uint256 indexed roundId,
        address indexed participant,
        uint256 entries,
        uint256 totalEntries
    );

    event LotteryWinnerDrawn(
        uint256 indexed roundId,
        address indexed winner,
        uint256 winningNumber,
        uint256 prizeAmount
    );

    event RandomnessConfigUpdated(
        address vrfCoordinator,
        bytes32 keyHash,
        uint256 fee,
        uint256 callbackGasLimit
    );

    event RandomnessSystemStatusChanged(bool enabled);
    event LotterySystemStatusChanged(bool enabled);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS - Gas Efficient Custom Errors
    // ═══════════════════════════════════════════════════════════════════════════

    error TerraStakeNFTRandomness__Unauthorized();
    error TerraStakeNFTRandomness__RandomnessDisabled();
    error TerraStakeNFTRandomness__LotteryDisabled();
    error TerraStakeNFTRandomness__InvalidRequestId(uint256 requestId);
    error TerraStakeNFTRandomness__InvalidRoundId(uint256 roundId);
    error TerraStakeNFTRandomness__InvalidPurpose(uint256 purpose);
    error TerraStakeNFTRandomness__RequestAlreadyFulfilled(uint256 requestId);
    error TerraStakeNFTRandomness__LotteryRoundNotActive(uint256 roundId);
    error TerraStakeNFTRandomness__LotteryRoundEnded(uint256 roundId);
    error TerraStakeNFTRandomness__InsufficientEntryFee(uint256 required, uint256 provided);
    error TerraStakeNFTRandomness__LotteryAlreadyDrawn(uint256 roundId);
    error TerraStakeNFTRandomness__VRFCoordinatorNotSet();
    error TerraStakeNFTRandomness__InsufficientLINKBalance();
    error TerraStakeNFTRandomness__AlreadyInitialized();
    error TerraStakeNFTRandomness__InvalidAmount(uint256 amount);

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS - Randomness Purposes
    // ═══════════════════════════════════════════════════════════════════════════

    uint256 private constant PURPOSE_MINT_RARITY = 1;
    uint256 private constant PURPOSE_TOKEN_UPGRADE = 2;
    uint256 private constant PURPOSE_LOTTERY_DRAW = 3;
    uint256 private constant PURPOSE_ENVIRONMENTAL_BONUS = 4;
    uint256 private constant PURPOSE_STAKING_BONUS = 5;

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION - PayRox Diamond Pattern
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initialize TerraStakeNFTRandomnessFacet with PayRox Diamond integration
     * @param manifestDispatcher The PayRox manifest dispatcher address
     * @param vrfCoordinator Chainlink VRF Coordinator address
     * @param keyHash VRF Key Hash
     * @param vrfFee VRF fee in LINK tokens
     */
    function initializeTerraStakeNFTRandomness(
        address manifestDispatcher,
        address vrfCoordinator,
        bytes32 keyHash,
        uint256 vrfFee
    ) external {
        LibDiamond.initializeDiamond(manifestDispatcher);
        
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        if (ds.initialized) revert TerraStakeNFTRandomness__AlreadyInitialized();
        
        ds.manifestDispatcher = manifestDispatcher;
        ds.randomnessEnabled = true;
        ds.lotteryEnabled = true;
        ds.initialized = true;
        
        // Configure VRF settings
        ds.vrfConfig = RandomnessConfig({
            vrfCoordinator: vrfCoordinator,
            keyHash: keyHash,
            fee: vrfFee,
            callbackGasLimit: 200000,
            requestConfirmations: 3,
            numWords: 1
        });
        
        // Start first lottery round
        _startInitialLotteryRound();
    }

    /**
     * @dev Start the initial lottery round
     */
    function _startInitialLotteryRound() private {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        
        uint256 roundId = ds.globalLotteryRoundId++;
        uint256 currentTime = block.timestamp;
        
        // Create new lottery round storage reference
        LotteryRound storage newRound = ds.lotteryRounds[roundId];
        newRound.roundId = roundId;
        newRound.startTime = currentTime;
        newRound.endTime = currentTime + 7 days; // 1 week lottery rounds
        newRound.entryFee = 10e18; // 10 tokens entry fee
        newRound.totalEntries = 0;
        newRound.prizePool = 0;
        newRound.active = true;
        newRound.drawn = false;
        newRound.winner = address(0);
        newRound.winningNumber = 0;
        newRound.vrfRequestId = 0;
        
        emit LotteryRoundStarted(roundId, currentTime, currentTime + 7 days, 10e18);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL - Via PayRox Manifest Dispatcher
    // ═══════════════════════════════════════════════════════════════════════════

    modifier onlyManifestDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }

    modifier onlyRandomnessManager() {
        LibDiamond.requireRole(keccak256("RANDOMNESS_MANAGER_ROLE"));
        _;
    }

    modifier onlyVRFCoordinator() {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        require(msg.sender == ds.vrfConfig.vrfCoordinator, "Only VRF Coordinator");
        _;
    }

    modifier whenRandomnessEnabled() {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        if (!ds.randomnessEnabled) revert TerraStakeNFTRandomness__RandomnessDisabled();
        _;
    }

    modifier whenLotteryEnabled() {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        if (!ds.lotteryEnabled) revert TerraStakeNFTRandomness__LotteryDisabled();
        _;
    }

    modifier onlyValidPurpose(uint256 purpose) {
        if (purpose == 0 || purpose > 5) {
            revert TerraStakeNFTRandomness__InvalidPurpose(purpose);
        }
        _;
    }

    modifier onlyPositiveAmount(uint256 amount) {
        if (amount == 0) {
            revert TerraStakeNFTRandomness__InvalidAmount(amount);
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RANDOMNESS FUNCTIONS - PayRox Diamond Facet Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Request randomness from Chainlink VRF
     * @param purpose Purpose code for the randomness request
     * @param seed Additional seed for extra randomness
     * @return requestId Unique request identifier
     */
    function requestRandomness(
        uint256 purpose,
        uint256 seed
    ) external 
        onlyManifestDispatcher
        whenRandomnessEnabled
        onlyValidPurpose(purpose)
        returns (uint256 requestId)
    {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        
        if (ds.vrfConfig.vrfCoordinator == address(0)) {
            revert TerraStakeNFTRandomness__VRFCoordinatorNotSet();
        }
        
        // Generate unique request ID
        requestId = ds.globalRequestId++;
        uint256 currentTime = block.timestamp;
        
        // Enhanced seed with multiple entropy sources
        uint256 enhancedSeed = uint256(keccak256(abi.encodePacked(
            seed,
            msg.sender,
            block.timestamp,
            block.difficulty,
            blockhash(block.number - 1),
            requestId
        )));
        
        // Store request
        ds.randomnessRequests[requestId] = RandomnessRequest({
            requestId: requestId,
            requester: msg.sender,
            purpose: purpose,
            timestamp: currentTime,
            seed: enhancedSeed,
            fulfilled: false,
            randomResult: 0,
            keyHash: ds.vrfConfig.keyHash,
            fee: ds.vrfConfig.fee
        });
        
        // Update mappings
        ds.userRandomnessRequests[msg.sender].push(requestId);
        ds.purposeToLastRequestId[purpose] = requestId;
        ds.totalRandomnessRequests++;
        
        // For demo purposes, we'll use a pseudo-random fallback
        // In production, this would call Chainlink VRF
        _fulfillRandomnessDemo(requestId, enhancedSeed);
        
        emit RandomnessRequested(requestId, msg.sender, purpose, enhancedSeed, currentTime);
        
        return requestId;
    }

    /**
     * @dev Demo randomness fulfillment (replace with actual VRF in production)
     * @param requestId Request ID to fulfill
     * @param seed Seed for randomness generation
     */
    function _fulfillRandomnessDemo(uint256 requestId, uint256 seed) private {
        // This is a demo implementation. In production, this would be called by VRF Coordinator
        uint256 randomResult = uint256(keccak256(abi.encodePacked(
            seed,
            block.timestamp,
            block.difficulty,
            blockhash(block.number - 1)
        )));
        
        _fulfillRandomness(requestId, randomResult);
    }

    /**
     * @notice Fulfill randomness request (called by VRF Coordinator)
     * @param requestId Request ID
     * @param randomness Random number from VRF
     */
    function fulfillRandomness(
        uint256 requestId,
        uint256 randomness
    ) external onlyVRFCoordinator {
        _fulfillRandomness(requestId, randomness);
    }

    /**
     * @dev Internal function to fulfill randomness
     * @param requestId Request ID
     * @param randomness Random number
     */
    function _fulfillRandomness(uint256 requestId, uint256 randomness) private {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        RandomnessRequest storage request = ds.randomnessRequests[requestId];
        
        if (request.requestId == 0) {
            revert TerraStakeNFTRandomness__InvalidRequestId(requestId);
        }
        
        if (request.fulfilled) {
            revert TerraStakeNFTRandomness__RequestAlreadyFulfilled(requestId);
        }
        
        // Fulfill request
        request.fulfilled = true;
        request.randomResult = randomness;
        
        // Store for historical reference
        bytes32 seedHash = keccak256(abi.encodePacked(request.seed));
        ds.randomnessSeedToResult[seedHash] = randomness;
        ds.blockHashHistory[block.number] = blockhash(block.number - 1);
        
        emit RandomnessFulfilled(requestId, request.requester, randomness, block.timestamp);
        
        // Handle purpose-specific logic
        _handleRandomnessPurpose(request.purpose, requestId, randomness);
    }

    /**
     * @dev Handle purpose-specific randomness logic
     * @param purpose Purpose code
     * @param requestId Request ID
     * @param randomness Random number
     */
    function _handleRandomnessPurpose(uint256 purpose, uint256 requestId, uint256 randomness) private {
        if (purpose == PURPOSE_LOTTERY_DRAW) {
            _handleLotteryDraw(requestId, randomness);
        }
        // Other purposes can be handled here
        // PURPOSE_MINT_RARITY, PURPOSE_TOKEN_UPGRADE, etc.
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LOTTERY FUNCTIONS - PayRox Diamond Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Enter current lottery round
     * @param entries Number of entries to purchase
     */
    function enterLottery(uint256 entries) external 
        onlyManifestDispatcher
        whenLotteryEnabled
        onlyPositiveAmount(entries)
    {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        uint256 currentRoundId = ds.globalLotteryRoundId - 1; // Current active round
        LotteryRound storage round = ds.lotteryRounds[currentRoundId];
        
        if (!round.active) {
            revert TerraStakeNFTRandomness__LotteryRoundNotActive(currentRoundId);
        }
        
        if (block.timestamp > round.endTime) {
            revert TerraStakeNFTRandomness__LotteryRoundEnded(currentRoundId);
        }
        
        uint256 totalCost = entries * round.entryFee;
        
        // Transfer entry fee from user (handled via Core facet)
        // For now, we'll assume the transfer is handled externally
        
        // Add entries
        if (round.userEntries[msg.sender] == 0) {
            round.participants.push(msg.sender);
            ds.userLotteryParticipation[msg.sender].push(currentRoundId);
        }
        
        round.userEntries[msg.sender] += entries;
        round.totalEntries += entries;
        round.prizePool += totalCost;
        
        emit LotteryEntryAdded(currentRoundId, msg.sender, entries, round.totalEntries);
    }

    /**
     * @notice Draw lottery winner for a round
     * @param roundId Round ID to draw
     */
    function drawLotteryWinner(uint256 roundId) external onlyManifestDispatcher onlyRandomnessManager {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        LotteryRound storage round = ds.lotteryRounds[roundId];
        
        if (round.roundId == 0) {
            revert TerraStakeNFTRandomness__InvalidRoundId(roundId);
        }
        
        if (round.drawn) {
            revert TerraStakeNFTRandomness__LotteryAlreadyDrawn(roundId);
        }
        
        if (block.timestamp <= round.endTime) {
            revert TerraStakeNFTRandomness__LotteryRoundNotActive(roundId);
        }
        
        if (round.totalEntries == 0) {
            // No participants, start new round
            round.active = false;
            round.drawn = true;
            _startNewLotteryRound();
            return;
        }
        
        // Request randomness for lottery draw
        uint256 seed = uint256(keccak256(abi.encodePacked(
            roundId,
            round.totalEntries,
            block.timestamp
        )));
        
        uint256 requestId = this.requestRandomness(PURPOSE_LOTTERY_DRAW, seed);
        round.vrfRequestId = requestId;
    }

    /**
     * @dev Handle lottery draw with randomness
     * @param requestId VRF request ID
     * @param randomness Random number from VRF
     */
    function _handleLotteryDraw(uint256 requestId, uint256 randomness) private {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        
        // Find the lottery round for this request
        uint256 roundId = 0;
        for (uint256 i = 0; i < ds.globalLotteryRoundId; i++) {
            if (ds.lotteryRounds[i].vrfRequestId == requestId) {
                roundId = i;
                break;
            }
        }
        
        if (roundId == 0 && ds.lotteryRounds[0].vrfRequestId != requestId) {
            return; // Request not found
        }
        
        LotteryRound storage round = ds.lotteryRounds[roundId];
        
        // Calculate winning number
        uint256 winningNumber = (randomness % round.totalEntries) + 1;
        
        // Find winner
        address winner = _findLotteryWinner(roundId, winningNumber);
        
        // Update round
        round.drawn = true;
        round.active = false;
        round.winner = winner;
        round.winningNumber = winningNumber;
        
        emit LotteryWinnerDrawn(roundId, winner, winningNumber, round.prizePool);
        
        // Transfer prize to winner (handled via Core facet)
        // Start new lottery round
        _startNewLotteryRound();
    }

    /**
     * @dev Find lottery winner based on winning number
     * @param roundId Round ID
     * @param winningNumber Winning number
     * @return Winner address
     */
    function _findLotteryWinner(uint256 roundId, uint256 winningNumber) private view returns (address) {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        LotteryRound storage round = ds.lotteryRounds[roundId];
        
        uint256 currentCount = 0;
        for (uint256 i = 0; i < round.participants.length; i++) {
            address participant = round.participants[i];
            uint256 userEntries = round.userEntries[participant];
            
            if (winningNumber <= currentCount + userEntries) {
                return participant;
            }
            
            currentCount += userEntries;
        }
        
        // Fallback to first participant
        return round.participants[0];
    }

    /**
     * @dev Start new lottery round
     */
    function _startNewLotteryRound() private {
        _startInitialLotteryRound();
    }

    /**
     * @notice Start new lottery round manually
     * @param duration Round duration in seconds
     * @param entryFee Entry fee per ticket
     */
    function startLotteryRound(
        uint256 duration,
        uint256 entryFee
    ) external onlyManifestDispatcher onlyRandomnessManager onlyPositiveAmount(entryFee) {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        
        uint256 roundId = ds.globalLotteryRoundId++;
        uint256 currentTime = block.timestamp;
        
        LotteryRound storage newRound = ds.lotteryRounds[roundId];
        newRound.roundId = roundId;
        newRound.startTime = currentTime;
        newRound.endTime = currentTime + duration;
        newRound.entryFee = entryFee;
        newRound.totalEntries = 0;
        newRound.prizePool = 0;
        newRound.active = true;
        newRound.drawn = false;
        newRound.winner = address(0);
        newRound.winningNumber = 0;
        newRound.vrfRequestId = 0;
        
        emit LotteryRoundStarted(roundId, currentTime, currentTime + duration, entryFee);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - PayRox Diamond Management
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Update VRF configuration
     * @param vrfCoordinator New VRF Coordinator address
     * @param keyHash New VRF key hash
     * @param fee New VRF fee
     * @param callbackGasLimit New callback gas limit
     */
    function updateVRFConfig(
        address vrfCoordinator,
        bytes32 keyHash,
        uint256 fee,
        uint256 callbackGasLimit
    ) external onlyManifestDispatcher onlyRandomnessManager {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        
        ds.vrfConfig.vrfCoordinator = vrfCoordinator;
        ds.vrfConfig.keyHash = keyHash;
        ds.vrfConfig.fee = fee;
        ds.vrfConfig.callbackGasLimit = callbackGasLimit;
        
        emit RandomnessConfigUpdated(vrfCoordinator, keyHash, fee, callbackGasLimit);
    }

    /**
     * @notice Set randomness system status
     * @param enabled Whether randomness is enabled
     */
    function setRandomnessEnabled(bool enabled) external onlyManifestDispatcher onlyRandomnessManager {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        ds.randomnessEnabled = enabled;
        
        emit RandomnessSystemStatusChanged(enabled);
    }

    /**
     * @notice Set lottery system status
     * @param enabled Whether lottery is enabled
     */
    function setLotteryEnabled(bool enabled) external onlyManifestDispatcher onlyRandomnessManager {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        ds.lotteryEnabled = enabled;
        
        emit LotterySystemStatusChanged(enabled);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS - PayRox Diamond Gas Optimized
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get randomness request information
     * @param requestId Request ID
     * @return Randomness request data
     */
    function getRandomnessRequest(uint256 requestId) external view returns (RandomnessRequest memory) {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        return ds.randomnessRequests[requestId];
    }

    /**
     * @notice Get user's randomness requests
     * @param user User address
     * @return Array of request IDs
     */
    function getUserRandomnessRequests(address user) external view returns (uint256[] memory) {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        return ds.userRandomnessRequests[user];
    }

    /**
     * @notice Get lottery round information
     * @param roundId Round ID
     * @return Round data and participants
     */
    function getLotteryRound(uint256 roundId) external view returns (
        uint256 startTime,
        uint256 endTime,
        uint256 entryFee,
        uint256 totalEntries,
        uint256 prizePool,
        address[] memory participants,
        bool active,
        bool drawn,
        address winner,
        uint256 winningNumber
    ) {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        LotteryRound storage round = ds.lotteryRounds[roundId];
        
        return (
            round.startTime,
            round.endTime,
            round.entryFee,
            round.totalEntries,
            round.prizePool,
            round.participants,
            round.active,
            round.drawn,
            round.winner,
            round.winningNumber
        );
    }

    /**
     * @notice Get user's lottery entries for a round
     * @param roundId Round ID
     * @param user User address
     * @return Number of entries
     */
    function getUserLotteryEntries(uint256 roundId, address user) external view returns (uint256) {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        return ds.lotteryRounds[roundId].userEntries[user];
    }

    /**
     * @notice Get current active lottery round ID
     * @return Current round ID
     */
    function getCurrentLotteryRound() external view returns (uint256) {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        if (ds.globalLotteryRoundId == 0) return 0;
        return ds.globalLotteryRoundId - 1;
    }

    /**
     * @notice Get VRF configuration
     * @return VRF configuration data
     */
    function getVRFConfig() external view returns (RandomnessConfig memory) {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        return ds.vrfConfig;
    }

    /**
     * @notice Get global randomness statistics
     * @return Global randomness stats
     */
    function getGlobalRandomnessStats() external view returns (
        uint256 totalRequests,
        uint256 totalLotteryRounds,
        bool randomnessEnabled,
        bool lotteryEnabled
    ) {
        TerraStakeNFTRandomnessStorage storage ds = terraStakeNFTRandomnessStorage();
        return (
            ds.totalRandomnessRequests,
            ds.globalLotteryRoundId,
            ds.randomnessEnabled,
            ds.lotteryEnabled
        );
    }

    /**
     * @notice Generate pseudo-random number for demo purposes
     * @param seed Input seed
     * @return Random number
     */
    function generatePseudoRandom(uint256 seed) external view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(
            seed,
            block.timestamp,
            block.difficulty,
            blockhash(block.number - 1),
            msg.sender
        )));
    }
}
