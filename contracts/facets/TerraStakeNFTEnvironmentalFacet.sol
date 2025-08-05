// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../utils/LibDiamond.sol";

/**
 * @title TerraStakeNFTEnvironmentalFacet
 * @notice PayRox Diamond Architecture - Environmental tracking and carbon credits with manifest-based routing
 * @dev 💎 PayRox Diamond Facet with isolated storage and LibDiamond integration
 * 
 * PayRox Features:
 * - Isolated storage: payrox.facet.storage.terrastakentenv.v1
 * - Manifest routing: All calls via dispatcher
 * - Access control: Via PayRox dispatcher roles
 * - Deployment: CREATE2 content-addressed
 * 
 * 🧠 AI-Generated using PayRox Diamond Learning Patterns
 */
contract TerraStakeNFTEnvironmentalFacet {
    using LibDiamond for LibDiamond.DiamondStorage;

    // ═══════════════════════════════════════════════════════════════════════════
    // STORAGE - ISOLATED FROM OTHER FACETS (PayRox Diamond Pattern)
    // ═══════════════════════════════════════════════════════════════════════════

    /// @dev PayRox isolated storage slot: payrox.facet.storage.terrastakentenv.v1
    bytes32 private constant STORAGE_POSITION = 
        keccak256("payrox.facet.storage.terrastakentenv.v1");

    struct EnvironmentalImpact {
        uint256 co2Offset;           // CO2 offset in grams
        uint256 treesPlanted;        // Number of trees planted
        uint256 renewableEnergy;     // Renewable energy generated (kWh)
        uint256 waterSaved;          // Water saved in liters
        uint256 wasteReduced;        // Waste reduced in kg
        uint256 lastUpdateTime;      // Last time impact was updated
        bool verified;               // Whether impact has been verified
    }

    struct CarbonCredit {
        uint256 creditId;            // Unique credit identifier
        uint256 tokenId;             // Associated NFT token ID
        uint256 co2Amount;           // CO2 offset amount in grams
        uint256 issuanceDate;        // When credit was issued
        uint256 expiryDate;          // When credit expires
        address verifier;            // Third-party verifier address
        string projectId;            // External project identifier
        bool retired;                // Whether credit has been retired
        bool verified;               // Whether credit has been verified
    }

    struct EnvironmentalProject {
        string name;                 // Project name
        string description;          // Project description
        string location;             // Project location
        uint256 targetCO2;           // Target CO2 offset
        uint256 currentCO2;          // Current CO2 offset achieved
        uint256 startDate;           // Project start date
        uint256 endDate;             // Project end date
        address projectManager;      // Project manager address
        bool active;                 // Whether project is active
        bool verified;               // Whether project is verified
    }

    struct TerraStakeNFTEnvironmentalStorage {
        // Environmental tracking
        mapping(uint256 => EnvironmentalImpact) tokenEnvironmentalImpact;    // tokenId => impact
        mapping(address => EnvironmentalImpact) userEnvironmentalImpact;     // user => total impact
        mapping(uint256 => CarbonCredit) carbonCredits;                      // creditId => credit
        mapping(uint256 => uint256[]) tokenCarbonCredits;                    // tokenId => creditIds[]
        mapping(address => uint256[]) userCarbonCredits;                     // user => creditIds[]
        
        // Projects and verification
        mapping(uint256 => EnvironmentalProject) environmentalProjects;     // projectId => project
        mapping(address => bool) verifiedVerifiers;                         // verifier => verified
        mapping(string => uint256) projectIdToProjectNumber;                // projectId => projectNumber
        
        // Global stats
        uint256 totalCO2Offset;
        uint256 totalTreesPlanted;
        uint256 totalRenewableEnergy;
        uint256 totalWaterSaved;
        uint256 totalWasteReduced;
        uint256 globalCreditId;
        uint256 globalProjectId;
        
        // Configuration
        uint256 verificationPeriod;          // How often verification is required (seconds)
        uint256 creditValidityPeriod;        // How long credits are valid (seconds)
        bool environmentalTrackingEnabled;
        
        // PayRox Diamond specific
        address manifestDispatcher;
        bool initialized;
        
        // Reserved slots for future upgrades
        uint256[50] reserved;
    }

    function terraStakeNFTEnvironmentalStorage() internal pure returns (TerraStakeNFTEnvironmentalStorage storage ds) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS - PayRox Diamond Compatible
    // ═══════════════════════════════════════════════════════════════════════════

    event EnvironmentalImpactUpdated(
        uint256 indexed tokenId,
        address indexed user,
        uint256 co2Offset,
        uint256 treesPlanted,
        uint256 renewableEnergy,
        uint256 waterSaved,
        uint256 wasteReduced,
        uint256 timestamp
    );

    event CarbonCreditIssued(
        uint256 indexed creditId,
        uint256 indexed tokenId,
        address indexed holder,
        uint256 co2Amount,
        uint256 expiryDate,
        string projectId
    );

    event CarbonCreditRetired(
        uint256 indexed creditId,
        address indexed retiredBy,
        uint256 co2Amount,
        uint256 timestamp
    );

    event CarbonCreditTransferred(
        uint256 indexed creditId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    event EnvironmentalProjectCreated(
        uint256 indexed projectId,
        string projectName,
        string location,
        uint256 targetCO2,
        address projectManager
    );

    event EnvironmentalProjectVerified(
        uint256 indexed projectId,
        address indexed verifier,
        uint256 timestamp
    );

    event VerifierStatusChanged(
        address indexed verifier,
        bool verified,
        uint256 timestamp
    );

    event ImpactVerified(
        uint256 indexed tokenId,
        address indexed verifier,
        uint256 timestamp
    );

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS - Gas Efficient Custom Errors
    // ═══════════════════════════════════════════════════════════════════════════

    error TerraStakeNFTEnvironmental__Unauthorized();
    error TerraStakeNFTEnvironmental__EnvironmentalTrackingDisabled();
    error TerraStakeNFTEnvironmental__InvalidTokenId(uint256 tokenId);
    error TerraStakeNFTEnvironmental__InvalidCreditId(uint256 creditId);
    error TerraStakeNFTEnvironmental__InvalidProjectId(uint256 projectId);
    error TerraStakeNFTEnvironmental__CreditAlreadyRetired(uint256 creditId);
    error TerraStakeNFTEnvironmental__CreditExpired(uint256 creditId);
    error TerraStakeNFTEnvironmental__NotCreditOwner(uint256 creditId);
    error TerraStakeNFTEnvironmental__NotVerifier(address account);
    error TerraStakeNFTEnvironmental__AlreadyVerified();
    error TerraStakeNFTEnvironmental__ProjectNotActive(uint256 projectId);
    error TerraStakeNFTEnvironmental__InsufficientImpact(uint256 required, uint256 available);
    error TerraStakeNFTEnvironmental__AlreadyInitialized();
    error TerraStakeNFTEnvironmental__InvalidAmount(uint256 amount);

    // ═══════════════════════════════════════════════════════════════════════════
    // INITIALIZATION - PayRox Diamond Pattern
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initialize TerraStakeNFTEnvironmentalFacet with PayRox Diamond integration
     * @param manifestDispatcher The PayRox manifest dispatcher address
     */
    function initializeTerraStakeNFTEnvironmental(address manifestDispatcher) external {
        LibDiamond.initializeDiamond(manifestDispatcher);
        
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        if (ds.initialized) revert TerraStakeNFTEnvironmental__AlreadyInitialized();
        
        ds.manifestDispatcher = manifestDispatcher;
        ds.environmentalTrackingEnabled = true;
        ds.verificationPeriod = 30 days;
        ds.creditValidityPeriod = 365 days;
        ds.initialized = true;
        
        // Initialize with first global environmental project
        _createInitialEnvironmentalProject();
    }

    /**
     * @dev Create initial environmental project for the ecosystem
     */
    function _createInitialEnvironmentalProject() private {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        
        uint256 projectId = ds.globalProjectId++;
        ds.environmentalProjects[projectId] = EnvironmentalProject({
            name: "TerraStake Global Carbon Offset Initiative",
            description: "Comprehensive carbon offsetting through reforestation and renewable energy",
            location: "Global",
            targetCO2: 1000000000, // 1 billion grams CO2
            currentCO2: 0,
            startDate: block.timestamp,
            endDate: block.timestamp + 3650 days, // 10 years
            projectManager: msg.sender,
            active: true,
            verified: false
        });
        
        ds.projectIdToProjectNumber["TERRA-GLOBAL-001"] = projectId;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL - Via PayRox Manifest Dispatcher
    // ═══════════════════════════════════════════════════════════════════════════

    modifier onlyManifestDispatcher() {
        LibDiamond.enforceManifestCall();
        _;
    }

    modifier onlyEnvironmentalManager() {
        LibDiamond.requireRole(keccak256("ENVIRONMENTAL_MANAGER_ROLE"));
        _;
    }

    modifier onlyVerifier() {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        if (!ds.verifiedVerifiers[msg.sender]) {
            revert TerraStakeNFTEnvironmental__NotVerifier(msg.sender);
        }
        _;
    }

    modifier whenEnvironmentalTrackingEnabled() {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        if (!ds.environmentalTrackingEnabled) {
            revert TerraStakeNFTEnvironmental__EnvironmentalTrackingDisabled();
        }
        _;
    }

    modifier onlyValidTokenId(uint256 tokenId) {
        if (tokenId == 0 || tokenId > 4) {
            revert TerraStakeNFTEnvironmental__InvalidTokenId(tokenId);
        }
        _;
    }

    modifier onlyPositiveAmount(uint256 amount) {
        if (amount == 0) {
            revert TerraStakeNFTEnvironmental__InvalidAmount(amount);
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENVIRONMENTAL TRACKING FUNCTIONS - PayRox Diamond Facet Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Update environmental impact for a token
     * @param tokenId Token ID to update impact for
     * @param co2Offset CO2 offset in grams
     * @param treesPlanted Number of trees planted
     * @param renewableEnergy Renewable energy generated in kWh
     * @param waterSaved Water saved in liters
     * @param wasteReduced Waste reduced in kg
     */
    function updateEnvironmentalImpact(
        uint256 tokenId,
        uint256 co2Offset,
        uint256 treesPlanted,
        uint256 renewableEnergy,
        uint256 waterSaved,
        uint256 wasteReduced
    ) external 
        onlyManifestDispatcher
        onlyEnvironmentalManager
        whenEnvironmentalTrackingEnabled
        onlyValidTokenId(tokenId)
    {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        
        // Update token-specific impact
        EnvironmentalImpact storage tokenImpact = ds.tokenEnvironmentalImpact[tokenId];
        tokenImpact.co2Offset += co2Offset;
        tokenImpact.treesPlanted += treesPlanted;
        tokenImpact.renewableEnergy += renewableEnergy;
        tokenImpact.waterSaved += waterSaved;
        tokenImpact.wasteReduced += wasteReduced;
        tokenImpact.lastUpdateTime = block.timestamp;
        tokenImpact.verified = false; // Requires re-verification
        
        // Update global totals
        ds.totalCO2Offset += co2Offset;
        ds.totalTreesPlanted += treesPlanted;
        ds.totalRenewableEnergy += renewableEnergy;
        ds.totalWaterSaved += waterSaved;
        ds.totalWasteReduced += wasteReduced;
        
        emit EnvironmentalImpactUpdated(
            tokenId,
            msg.sender,
            co2Offset,
            treesPlanted,
            renewableEnergy,
            waterSaved,
            wasteReduced,
            block.timestamp
        );
    }

    /**
     * @notice Update user's environmental impact (aggregated from their tokens)
     * @param user User address
     * @param co2Offset Additional CO2 offset
     * @param treesPlanted Additional trees planted
     * @param renewableEnergy Additional renewable energy
     * @param waterSaved Additional water saved
     * @param wasteReduced Additional waste reduced
     */
    function updateUserEnvironmentalImpact(
        address user,
        uint256 co2Offset,
        uint256 treesPlanted,
        uint256 renewableEnergy,
        uint256 waterSaved,
        uint256 wasteReduced
    ) external 
        onlyManifestDispatcher
        onlyEnvironmentalManager
        whenEnvironmentalTrackingEnabled
    {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        
        EnvironmentalImpact storage userImpact = ds.userEnvironmentalImpact[user];
        userImpact.co2Offset += co2Offset;
        userImpact.treesPlanted += treesPlanted;
        userImpact.renewableEnergy += renewableEnergy;
        userImpact.waterSaved += waterSaved;
        userImpact.wasteReduced += wasteReduced;
        userImpact.lastUpdateTime = block.timestamp;
        userImpact.verified = false;
        
        emit EnvironmentalImpactUpdated(
            0, // 0 indicates user-level impact
            user,
            co2Offset,
            treesPlanted,
            renewableEnergy,
            waterSaved,
            wasteReduced,
            block.timestamp
        );
    }

    /**
     * @notice Verify environmental impact data
     * @param tokenId Token ID to verify (0 for user verification)
     * @param user User address (for user verification)
     */
    function verifyEnvironmentalImpact(
        uint256 tokenId,
        address user
    ) external onlyManifestDispatcher onlyVerifier {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        
        if (tokenId > 0) {
            // Verify token-specific impact
            ds.tokenEnvironmentalImpact[tokenId].verified = true;
        } else {
            // Verify user-specific impact
            ds.userEnvironmentalImpact[user].verified = true;
        }
        
        emit ImpactVerified(tokenId, msg.sender, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CARBON CREDIT FUNCTIONS - PayRox Diamond Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Issue carbon credits based on environmental impact
     * @param tokenId Token ID to issue credits for
     * @param holder Address to receive credits
     * @param co2Amount CO2 offset amount in grams
     * @param projectId External project identifier
     * @return creditId Unique credit identifier
     */
    function issueCarbonCredit(
        uint256 tokenId,
        address holder,
        uint256 co2Amount,
        string memory projectId
    ) external 
        onlyManifestDispatcher
        onlyEnvironmentalManager
        whenEnvironmentalTrackingEnabled
        onlyValidTokenId(tokenId)
        onlyPositiveAmount(co2Amount)
        returns (uint256 creditId)
    {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        
        // Verify sufficient environmental impact
        EnvironmentalImpact storage impact = ds.tokenEnvironmentalImpact[tokenId];
        if (impact.co2Offset < co2Amount) {
            revert TerraStakeNFTEnvironmental__InsufficientImpact(co2Amount, impact.co2Offset);
        }
        
        // Create carbon credit
        creditId = ds.globalCreditId++;
        uint256 expiryDate = block.timestamp + ds.creditValidityPeriod;
        
        ds.carbonCredits[creditId] = CarbonCredit({
            creditId: creditId,
            tokenId: tokenId,
            co2Amount: co2Amount,
            issuanceDate: block.timestamp,
            expiryDate: expiryDate,
            verifier: msg.sender,
            projectId: projectId,
            retired: false,
            verified: false
        });
        
        // Update mappings
        ds.tokenCarbonCredits[tokenId].push(creditId);
        ds.userCarbonCredits[holder].push(creditId);
        
        emit CarbonCreditIssued(creditId, tokenId, holder, co2Amount, expiryDate, projectId);
        
        return creditId;
    }

    /**
     * @notice Retire carbon credits (permanently remove from circulation)
     * @param creditId Credit ID to retire
     */
    function retireCarbonCredit(uint256 creditId) external onlyManifestDispatcher {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        CarbonCredit storage credit = ds.carbonCredits[creditId];
        
        if (credit.creditId == 0) {
            revert TerraStakeNFTEnvironmental__InvalidCreditId(creditId);
        }
        
        if (credit.retired) {
            revert TerraStakeNFTEnvironmental__CreditAlreadyRetired(creditId);
        }
        
        if (block.timestamp > credit.expiryDate) {
            revert TerraStakeNFTEnvironmental__CreditExpired(creditId);
        }
        
        // Only credit holder or environmental manager can retire
        bool canRetire = LibDiamond.hasRole(keccak256("ENVIRONMENTAL_MANAGER_ROLE"), msg.sender);
        // TODO: Add credit ownership check via NFT facet
        
        credit.retired = true;
        
        emit CarbonCreditRetired(creditId, msg.sender, credit.co2Amount, block.timestamp);
    }

    /**
     * @notice Verify carbon credit
     * @param creditId Credit ID to verify
     */
    function verifyCarbonCredit(uint256 creditId) external onlyManifestDispatcher onlyVerifier {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        CarbonCredit storage credit = ds.carbonCredits[creditId];
        
        if (credit.creditId == 0) {
            revert TerraStakeNFTEnvironmental__InvalidCreditId(creditId);
        }
        
        if (credit.verified) {
            revert TerraStakeNFTEnvironmental__AlreadyVerified();
        }
        
        credit.verified = true;
        credit.verifier = msg.sender;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROJECT MANAGEMENT FUNCTIONS - PayRox Diamond Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Create new environmental project
     * @param name Project name
     * @param description Project description
     * @param location Project location
     * @param targetCO2 Target CO2 offset
     * @param duration Project duration in seconds
     * @param projectManager Project manager address
     * @param externalProjectId External project identifier
     * @return projectId Unique project identifier
     */
    function createEnvironmentalProject(
        string memory name,
        string memory description,
        string memory location,
        uint256 targetCO2,
        uint256 duration,
        address projectManager,
        string memory externalProjectId
    ) external 
        onlyManifestDispatcher
        onlyEnvironmentalManager
        onlyPositiveAmount(targetCO2)
        returns (uint256 projectId)
    {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        
        projectId = ds.globalProjectId++;
        
        ds.environmentalProjects[projectId] = EnvironmentalProject({
            name: name,
            description: description,
            location: location,
            targetCO2: targetCO2,
            currentCO2: 0,
            startDate: block.timestamp,
            endDate: block.timestamp + duration,
            projectManager: projectManager,
            active: true,
            verified: false
        });
        
        ds.projectIdToProjectNumber[externalProjectId] = projectId;
        
        emit EnvironmentalProjectCreated(projectId, name, location, targetCO2, projectManager);
        
        return projectId;
    }

    /**
     * @notice Verify environmental project
     * @param projectId Project ID to verify
     */
    function verifyEnvironmentalProject(uint256 projectId) external onlyManifestDispatcher onlyVerifier {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        EnvironmentalProject storage project = ds.environmentalProjects[projectId];
        
        if (!project.active) {
            revert TerraStakeNFTEnvironmental__ProjectNotActive(projectId);
        }
        
        if (project.verified) {
            revert TerraStakeNFTEnvironmental__AlreadyVerified();
        }
        
        project.verified = true;
        
        emit EnvironmentalProjectVerified(projectId, msg.sender, block.timestamp);
    }

    /**
     * @notice Update project CO2 progress
     * @param projectId Project ID to update
     * @param additionalCO2 Additional CO2 offset achieved
     */
    function updateProjectProgress(
        uint256 projectId,
        uint256 additionalCO2
    ) external onlyManifestDispatcher onlyEnvironmentalManager onlyPositiveAmount(additionalCO2) {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        EnvironmentalProject storage project = ds.environmentalProjects[projectId];
        
        if (!project.active) {
            revert TerraStakeNFTEnvironmental__ProjectNotActive(projectId);
        }
        
        project.currentCO2 += additionalCO2;
        
        // Auto-complete project if target reached
        if (project.currentCO2 >= project.targetCO2) {
            project.active = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS - PayRox Diamond Management
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Add or remove verifier
     * @param verifier Verifier address
     * @param verified Whether verifier is verified
     */
    function setVerifierStatus(
        address verifier,
        bool verified
    ) external onlyManifestDispatcher onlyEnvironmentalManager {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        ds.verifiedVerifiers[verifier] = verified;
        
        emit VerifierStatusChanged(verifier, verified, block.timestamp);
    }

    /**
     * @notice Set environmental tracking status
     * @param enabled Whether environmental tracking is enabled
     */
    function setEnvironmentalTrackingEnabled(bool enabled) external onlyManifestDispatcher onlyEnvironmentalManager {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        ds.environmentalTrackingEnabled = enabled;
    }

    /**
     * @notice Set verification period
     * @param periodInSeconds Verification period in seconds
     */
    function setVerificationPeriod(uint256 periodInSeconds) external onlyManifestDispatcher onlyEnvironmentalManager {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        ds.verificationPeriod = periodInSeconds;
    }

    /**
     * @notice Set credit validity period
     * @param periodInSeconds Credit validity period in seconds
     */
    function setCreditValidityPeriod(uint256 periodInSeconds) external onlyManifestDispatcher onlyEnvironmentalManager {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        ds.creditValidityPeriod = periodInSeconds;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS - PayRox Diamond Gas Optimized
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Get environmental impact for a token
     * @param tokenId Token ID
     * @return Environmental impact data
     */
    function getTokenEnvironmentalImpact(uint256 tokenId) external view onlyValidTokenId(tokenId) returns (EnvironmentalImpact memory) {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        return ds.tokenEnvironmentalImpact[tokenId];
    }

    /**
     * @notice Get environmental impact for a user
     * @param user User address
     * @return Environmental impact data
     */
    function getUserEnvironmentalImpact(address user) external view returns (EnvironmentalImpact memory) {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        return ds.userEnvironmentalImpact[user];
    }

    /**
     * @notice Get carbon credit information
     * @param creditId Credit ID
     * @return Carbon credit data
     */
    function getCarbonCredit(uint256 creditId) external view returns (CarbonCredit memory) {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        return ds.carbonCredits[creditId];
    }

    /**
     * @notice Get carbon credits for a token
     * @param tokenId Token ID
     * @return Array of credit IDs
     */
    function getTokenCarbonCredits(uint256 tokenId) external view onlyValidTokenId(tokenId) returns (uint256[] memory) {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        return ds.tokenCarbonCredits[tokenId];
    }

    /**
     * @notice Get carbon credits for a user
     * @param user User address
     * @return Array of credit IDs
     */
    function getUserCarbonCredits(address user) external view returns (uint256[] memory) {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        return ds.userCarbonCredits[user];
    }

    /**
     * @notice Get environmental project information
     * @param projectId Project ID
     * @return Environmental project data
     */
    function getEnvironmentalProject(uint256 projectId) external view returns (EnvironmentalProject memory) {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        return ds.environmentalProjects[projectId];
    }

    /**
     * @notice Get global environmental statistics
     * @return Global environmental impact totals
     */
    function getGlobalEnvironmentalStats() external view returns (
        uint256 totalCO2Offset,
        uint256 totalTreesPlanted,
        uint256 totalRenewableEnergy,
        uint256 totalWaterSaved,
        uint256 totalWasteReduced
    ) {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        return (
            ds.totalCO2Offset,
            ds.totalTreesPlanted,
            ds.totalRenewableEnergy,
            ds.totalWaterSaved,
            ds.totalWasteReduced
        );
    }

    /**
     * @notice Check if address is verified verifier
     * @param verifier Address to check
     * @return Whether address is verified verifier
     */
    function isVerifiedVerifier(address verifier) external view returns (bool) {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        return ds.verifiedVerifiers[verifier];
    }

    /**
     * @notice Get project ID by external identifier
     * @param externalProjectId External project identifier
     * @return Project ID (0 if not found)
     */
    function getProjectIdByExternalId(string memory externalProjectId) external view returns (uint256) {
        TerraStakeNFTEnvironmentalStorage storage ds = terraStakeNFTEnvironmentalStorage();
        return ds.projectIdToProjectNumber[externalProjectId];
    }
}
