// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title ExampleFacetB
 * @notice Delegatecalled facet to be routed by a Manifest‑gated dispatcher.
 * @dev Diamond‑safe storage (fixed slot), L2‑friendly bounds, no external calls.
 */
contract ExampleFacetB {
    /* ───────────────────────────── Errors ───────────────────────────── */
    error Paused();
    error InvalidOperationType();
    error EmptyData();
    error DataTooLarge();
    error TooManyOperations();
    error LengthMismatch();
    error NotOperator();
    error AlreadyInitialized();

    /* ─────────── Gas / L2‑friendly caps & constants ─────────── */
    uint256 private constant MAX_OPERATION_TYPE = 5;     // valid types: 1..5
    uint256 private constant MAX_BATCH          = 20;    // per-call ops bound
    uint256 private constant MAX_DATA_BYTES     = 1024;  // bound op payload
    uint256 private constant MAX_USER_OPS       = 256;   // ring buffer size

    /* ───────────────────────────── Events ───────────────────────────── */
    event FacetBExecuted(address indexed caller, uint256 indexed operationType, bytes32 indexed dataHash);
    event StateChanged(uint256 oldValue, uint256 newValue, address indexed changer);
    event BatchOperationCompleted(uint256 operationCount, uint256 successCount, address indexed executor);

    /* ─────────────── Diamond‑safe storage (fixed slot) ─────────────── */
    // Unique slot for this facet’s state.
    bytes32 private constant _SLOT = keccak256("payrox.facets.exampleB.v1");

    struct OperationData {
        uint32  operationType;   // packed
        uint64  timestamp;       // packed
        address executor;        // packed with bool in same slot via Solidity
        bool    executed;        // packed
        bytes   data;            // separate slot (dynamic)
    }

    struct UserOpsRB {
        uint32 head;  // next write index
        uint32 size;  // number of filled entries (<= MAX_USER_OPS)
        mapping(uint256 => uint256) buf; // circular buffer of op types
    }

    struct Layout {
        // Core state
        uint256 currentValue;
        uint256 operationCounter;
        address lastExecutor;

        // Ops index & per‑user bounded history
        mapping(bytes32 => OperationData) operations;
        mapping(address => UserOpsRB) userOps;

        // Op controls
        bool    paused;
        address operator;        // can set paused
        bool    initialized;     // one‑time initializer guard
    }

    function _layout() private pure returns (Layout storage l) {
        bytes32 slot = _SLOT;
        assembly { l.slot := slot }
    }

    modifier whenNotPaused() {
        if (_layout().paused) revert Paused();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != _layout().operator) revert NotOperator();
        _;
    }

    /* ───────────────────────────── Admin (init) ───────────────────────────── */
    /**
     * @notice One‑time initializer to set the facet operator (dispatcher admin should call this).
     * @dev Call this immediately after routing the facet; cannot be called again.
     */
    function initializeFacetB(address operator_) external {
        Layout storage l = _layout();
        if (l.initialized) revert AlreadyInitialized();
        l.operator = operator_;
        l.initialized = true;
    }

    /**
     * @notice Set pause state (operator‑gated).
     */
    function setPaused(bool paused_) external onlyOperator {
        _layout().paused = paused_;
    }

    /* ───────────────────────────── API ───────────────────────────── */

    /**
     * @dev Execute a stateful operation with bounded payload.
     * @return operationId The ID of the created operation.
     */
    function executeB(
        uint256 operationType,
        bytes calldata data
    ) external whenNotPaused returns (bytes32 operationId) {
        if (operationType == 0 || operationType > MAX_OPERATION_TYPE) revert InvalidOperationType();
        uint256 len = data.length;
        if (len == 0) revert EmptyData();
        if (len > MAX_DATA_BYTES) revert DataTooLarge();

        Layout storage l = _layout();

        // Increment first for a unique monotonic counter.
        unchecked { l.operationCounter += 1; }
        uint256 ctr = l.operationCounter;

        // Stable ID (includes chainid + data hash for compactness).
        operationId = keccak256(
            abi.encodePacked(msg.sender, operationType, keccak256(data), block.chainid, ctr)
        );

        // Record operation (stores bounded payload).
        l.operations[operationId] = OperationData({
            operationType: uint32(operationType),
            timestamp: uint64(block.timestamp),
            executor: msg.sender,
            executed: true,
            data: data
        });

        // Per‑user bounded history via ring buffer.
        UserOpsRB storage rb = l.userOps[msg.sender];
        uint32 head = rb.head;
        rb.buf[head] = operationType;
        unchecked {
            head = (head + 1) % uint32(MAX_USER_OPS);
        }
        rb.head = head;
        if (rb.size < MAX_USER_OPS) {
            rb.size += 1;
        }

        // Apply the operation to state.
        _applyOperation(operationType, data, l);

        l.lastExecutor = msg.sender;

        emit FacetBExecuted(msg.sender, operationType, keccak256(data));
    }

    /**
     * @dev Batch execute multiple operations (bounded and gas‑aware).
     * @return results Array of operation IDs (0 if skipped due to invalid input).
     */
    function batchExecuteB(
        uint256[] calldata operations,
        bytes[] calldata dataArray
    ) external whenNotPaused returns (bytes32[] memory results) {
        uint256 n = operations.length;
        if (n == 0) revert TooManyOperations(); // reuse error name for empty edge
        if (n != dataArray.length) revert LengthMismatch();
        if (n > MAX_BATCH) revert TooManyOperations();

        results = new bytes32[](n);
        uint256 successCount;

        Layout storage l = _layout();

        for (uint256 i; i < n; ) {
            uint256 op = operations[i];
            bytes calldata dat = dataArray[i];

            if (
                op > 0 &&
                op <= MAX_OPERATION_TYPE &&
                dat.length > 0 &&
                dat.length <= MAX_DATA_BYTES
            ) {
                // Inline the single‑call logic for gas: avoid external self‑calls.
                unchecked { l.operationCounter += 1; }
                uint256 ctr = l.operationCounter;

                bytes32 operationId = keccak256(
                    abi.encodePacked(msg.sender, op, keccak256(dat), block.chainid, ctr)
                );

                l.operations[operationId] = OperationData({
                    operationType: uint32(op),
                    timestamp: uint64(block.timestamp),
                    executor: msg.sender,
                    executed: true,
                    data: dat
                });

                // Ring buffer write
                UserOpsRB storage rb = l.userOps[msg.sender];
                uint32 head = rb.head;
                rb.buf[head] = op;
                unchecked { head = (head + 1) % uint32(MAX_USER_OPS); }
                rb.head = head;
                if (rb.size < MAX_USER_OPS) {
                    rb.size += 1;
                }

                _applyOperation(op, dat, l);
                results[i] = operationId;
                successCount++;
            }
            unchecked { ++i; }
        }

        l.lastExecutor = msg.sender;
        emit BatchOperationCompleted(n, successCount, msg.sender);
    }

    /**
     * @dev Get operation details by ID.
     */
    function getOperation(bytes32 operationId)
        external
        view
        returns (OperationData memory operation)
    {
        return _layout().operations[operationId];
    }

    /**
     * @dev Return the caller’s recent operation types (bounded ring buffer).
     *      Returns most‑recent‑first order.
     */
    function getUserOperations(address user)
        external
        view
        returns (uint256[] memory operationTypes)
    {
        Layout storage l = _layout();
        UserOpsRB storage rb = l.userOps[user];

        uint256 sz = rb.size;
        operationTypes = new uint256[](sz);
        if (sz == 0) return operationTypes;

        // Walk from newest to oldest.
        uint256 head = rb.head;
        for (uint256 i; i < sz; ) {
            // Index of the (sz - 1 - i)-th previous element
            uint256 idx;
            unchecked {
                uint256 offset = (MAX_USER_OPS + head - 1 - i) % MAX_USER_OPS;
                idx = offset;
            }
            operationTypes[i] = rb.buf[idx];
            unchecked { ++i; }
        }
    }

    /**
     * @dev Pure utility: a toy composite calculation.
     */
    function complexCalculation(uint256[] calldata inputs) external pure returns (uint256 result) {
        uint256 n = inputs.length;
        if (n == 0) revert EmptyData();
        result = inputs[0];
        for (uint256 i = 1; i < n; ) {
            // Alternate + and scaled multiply, intentionally simple.
            if (i % 2 == 0) {
                result = result + inputs[i];
            } else {
                result = (result * inputs[i]) / 100;
            }
            unchecked { ++i; }
        }
    }

    /**
     * @dev State summary for dashboards.
     */
    function getStateSummary()
        external
        view
        returns (uint256 value, uint256 operations, address executor, bool paused)
    {
        Layout storage l = _layout();
        return (l.currentValue, l.operationCounter, l.lastExecutor, l.paused);
    }

    /* ───────────────────────────── Internals ───────────────────────────── */

    function _applyOperation(uint256 operationType, bytes calldata data, Layout storage l) private {
        uint256 oldValue = l.currentValue;
        if (operationType == 1) {
            uint256 inc = abi.decode(data, (uint256));
            l.currentValue = oldValue + inc;
        } else if (operationType == 2) {
            uint256 dec = abi.decode(data, (uint256));
            // saturating subtract semantics
            l.currentValue = dec > oldValue ? 0 : oldValue - dec;
        } else if (operationType == 3) {
            uint256 mulPct = abi.decode(data, (uint256));
            l.currentValue = (oldValue * mulPct) / 100;
        } else if (operationType == 4) {
            l.currentValue = 0;
        } else if (operationType == 5) {
            (uint256 a, uint256 b, uint256 c) = abi.decode(data, (uint256, uint256, uint256));
            l.currentValue = ((a + b) * c) / 2;
        }
        emit StateChanged(oldValue, l.currentValue, msg.sender);
    }

    /* ───────────────────────── Facet metadata ─────────────────────────── */

    function getFacetInfoB()
        external
        pure
        returns (string memory name, string memory version, bytes4[] memory selectors)
    {
        name = "ExampleFacetB";
        version = "1.1.0";

        selectors = new bytes4[](9);
        selectors[0] = this.initializeFacetB.selector;
        selectors[1] = this.setPaused.selector;
        selectors[2] = this.executeB.selector;
        selectors[3] = this.batchExecuteB.selector;
        selectors[4] = this.getOperation.selector;
        selectors[5] = this.getUserOperations.selector;
        selectors[6] = this.complexCalculation.selector;
        selectors[7] = this.getStateSummary.selector;
        selectors[8] = this.getFacetInfoB.selector;
    }
}
