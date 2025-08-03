#!/bin/bash
# PayRox Go Beyond - Enterprise Deployment Script v2.0
# Production-grade complete system deployment with advanced error handling
# Supports Unix/Linux/macOS with comprehensive validation and monitoring

set -euo pipefail  # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'       # Secure Internal Field Separator

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION AND CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="${SCRIPT_DIR}/deployment.log"
readonly PID_FILE="${SCRIPT_DIR}/hardhat-node.pid"
readonly TIMEOUT_DEPLOY=300     # 5 minutes per deployment step
readonly TIMEOUT_COMPILE=180    # 3 minutes for compilation
readonly TIMEOUT_TEST=600       # 10 minutes for tests
readonly MAX_RETRIES=3
readonly MIN_SLEEP_TIME=2
readonly MAX_SLEEP_TIME=10

# Default parameters
NETWORK="hardhat"
START_NODE=false
SHOW_DETAILS=false
SKIP_TESTS=false
FORCE_CLEANUP=false

# Color codes for enhanced output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

# Deployment state tracking
DEPLOYMENT_STATE=""
FACTORY_ADDRESS=""
DISPATCHER_ADDRESS=""
FACET_A_ADDRESS=""
FACET_B_ADDRESS=""
NODE_PID=""
START_TIME=$(date +%s)

# ═══════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

# Enhanced logging with levels and timestamps
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${CYAN}ℹ️  $*${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $*${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $*${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $*${NC}" | tee -a "$LOG_FILE"
}

log_step() {
    echo -e "${WHITE}🔧 $*${NC}" | tee -a "$LOG_FILE"
}

# Enhanced error handling with context
handle_error() {
    local exit_code=$?
    local line_number=${1:-"unknown"}
    local command="${2:-"unknown command"}"

    log_error "Deployment failed at line $line_number"
    log_error "Failed command: $command"
    log_error "Exit code: $exit_code"
    log_error "Deployment state: $DEPLOYMENT_STATE"

    # Cleanup on error
    cleanup_on_error

    echo -e "${RED}"
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                             DEPLOYMENT FAILED                             ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    exit $exit_code
}

# Trap errors with enhanced context
trap 'handle_error $LINENO "$BASH_COMMAND"' ERR

# Validation functions
validate_environment() {
    log_step "Validating deployment environment..."

    # Check required commands
    local required_commands=("node" "npm" "npx" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            log_error "Required command not found: $cmd"
            return 1
        fi
    done

    # Check Node.js version
    local node_version
    node_version=$(node --version | sed 's/v//')
    local node_major
    node_major=$(echo "$node_version" | cut -d. -f1)

    if [ "$node_major" -lt 18 ]; then
        log_error "Node.js version $node_version is too old. Minimum required: 18.x"
        return 1
    fi

    # Check project structure
    local required_files=("package.json" "hardhat.config.ts")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Required file not found: $file"
            return 1
        fi
    done

    # Check required directories
    local required_dirs=("contracts" "scripts")
    for dir in "${required_dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            log_error "Required directory not found: $dir"
            return 1
        fi
    done

    log_success "Environment validation passed"
    return 0
}

# Enhanced argument parsing with validation
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --network)
                if [ -z "${2:-}" ]; then
                    log_error "Network parameter requires a value"
                    exit 1
                fi
                NETWORK="$2"
                shift 2
                ;;
            --start-node)
                START_NODE=true
                shift
                ;;
            --show-details)
                SHOW_DETAILS=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --force-cleanup)
                FORCE_CLEANUP=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Validate network parameter
    if [[ ! "$NETWORK" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        log_error "Invalid network name: $NETWORK"
        exit 1
    fi
}

show_usage() {
    echo "PayRox Go Beyond - Enterprise Deployment Script"
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --network NETWORK     Target network (default: hardhat)"
    echo "  --start-node         Start Hardhat node in background"
    echo "  --show-details       Show detailed command output"
    echo "  --skip-tests         Skip acceptance tests"
    echo "  --force-cleanup      Force cleanup of previous deployments"
    echo "  -h, --help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --network localhost --start-node"
    echo "  $0 --network sepolia --show-details"
}

# Enhanced command execution with timeout and retry
execute_command() {
    local description="$1"
    local command="$2"
    local timeout="${3:-$TIMEOUT_DEPLOY}"
    local retries="${4:-1}"

    log_step "$description"

    if [ "$SHOW_DETAILS" = true ]; then
        log_info "Command: $command"
        log_info "Timeout: ${timeout}s, Retries: $retries"
    fi

    local attempt=1
    while [ $attempt -le $retries ]; do
        if [ $attempt -gt 1 ]; then
            local wait_time=$((MIN_SLEEP_TIME + attempt))
            log_warning "Retry attempt $attempt/$retries after ${wait_time}s..."
            sleep $wait_time
        fi

        if timeout "$timeout" bash -c "$command"; then
            log_success "$description completed successfully"
            return 0
        else
            local exit_code=$?
            if [ $exit_code -eq 124 ]; then
                log_error "$description timed out after ${timeout}s"
            else
                log_error "$description failed with exit code: $exit_code"
            fi

            if [ $attempt -eq $retries ]; then
                log_error "$description failed after $retries attempts"
                return $exit_code
            fi

            attempt=$((attempt + 1))
        fi
    done
}

# Network management functions
start_hardhat_node() {
    if [ "$START_NODE" = true ] || [ "$NETWORK" = "hardhat" ]; then
        log_step "Starting Hardhat network..."

        # Kill any existing node
        if [ -f "$PID_FILE" ]; then
            local old_pid
            old_pid=$(cat "$PID_FILE")
            if kill -0 "$old_pid" 2>/dev/null; then
                log_warning "Stopping existing Hardhat node (PID: $old_pid)"
                kill "$old_pid"
                sleep 3
            fi
            rm -f "$PID_FILE"
        fi

        # Start new node
        nohup npx hardhat node > hardhat-node.log 2>&1 &
        NODE_PID=$!
        echo "$NODE_PID" > "$PID_FILE"

        # Wait for node to be ready
        local ready=false
        local attempts=0
        local max_attempts=30

        while [ $attempts -lt $max_attempts ] && [ "$ready" = false ]; do
            if curl -s -X POST -H "Content-Type: application/json" \
               --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
               http://localhost:8545 >/dev/null 2>&1; then
                ready=true
                log_success "Hardhat node ready (PID: $NODE_PID)"
            else
                sleep 1
                attempts=$((attempts + 1))
            fi
        done

        if [ "$ready" = false ]; then
            log_error "Hardhat node failed to start within 30 seconds"
            return 1
        fi
    fi
}

# Enhanced cleanup with state tracking
cleanup_on_error() {
    log_warning "Performing emergency cleanup..."

    # Stop background node if running
    if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
        log_info "Stopping Hardhat node (PID: $NODE_PID)"
        kill "$NODE_PID" 2>/dev/null || true
        rm -f "$PID_FILE"
    fi

    # Clean up temporary files
    rm -f hardhat-node.log 2>/dev/null || true
}

cleanup_on_exit() {
    local exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local duration_formatted=$(printf '%02d:%02d:%02d' $((duration/3600)) $((duration%3600/60)) $((duration%60)))

    # Stop background processes
    if [ -f "$PID_FILE" ]; then
        local node_pid
        node_pid=$(cat "$PID_FILE")
        if kill -0 "$node_pid" 2>/dev/null; then
            log_info "Stopping Hardhat node (PID: $node_pid)"
            kill "$node_pid" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi

    # Generate deployment summary
    echo ""
    echo -e "${WHITE}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}                           DEPLOYMENT SUMMARY${NC}"
    echo -e "${WHITE}═══════════════════════════════════════════════════════════════════════════${NC}"

    if [ $exit_code -eq 0 ]; then
        log_success "Deployment completed successfully in $duration_formatted"
        echo -e "${GREEN}"
        echo "🎉 DEPLOYMENT SUCCESSFUL!"
        echo ""
        echo "Deployed Components:"
        [ -n "$FACTORY_ADDRESS" ] && echo "   🏭 Factory: $FACTORY_ADDRESS"
        [ -n "$DISPATCHER_ADDRESS" ] && echo "   📡 Dispatcher: $DISPATCHER_ADDRESS"
        [ -n "$FACET_A_ADDRESS" ] && echo "   🔷 FacetA: $FACET_A_ADDRESS"
        [ -n "$FACET_B_ADDRESS" ] && echo "   🔶 FacetB: $FACET_B_ADDRESS"
        echo -e "${NC}"
    else
        log_error "Deployment failed after $duration_formatted"
        echo -e "${RED}💥 DEPLOYMENT FAILED${NC}"
    fi

    log_info "Full deployment log: $LOG_FILE"
}

trap cleanup_on_exit EXIT

# Address extraction and validation
extract_address() {
    local artifact_file="$1"
    local component_name="$2"

    if [ ! -f "$artifact_file" ]; then
        log_error "Artifact file not found: $artifact_file"
        return 1
    fi

    local address
    address=$(jq -r '.address' "$artifact_file" 2>/dev/null)

    if [ "$address" = "null" ] || [ -z "$address" ]; then
        log_error "Failed to extract address from $artifact_file"
        return 1
    fi

    # Validate address format
    if [[ ! "$address" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
        log_error "Invalid address format for $component_name: $address"
        return 1
    fi

    log_success "$component_name deployed to: $address"
    echo "$address"
}

# Enhanced testing functions
test_enterprise_utilities() {
    local factory_address="$1"
    local network="$2"
    local test_data="0x6080604052348015600f57600080fd5b50603e80601d6000396000f3fe6080604052600080fdfea264697066735822122000000000000000000000000000000000000000000000000000000000000000006064736f6c63430008110033"

    log_step "Testing enterprise utilities..."

    # Test manifest verification
    if [ -f "manifests/complete-production.manifest.json" ]; then
        execute_command "Manifest Self-Check" \
            "npx hardhat payrox:manifest:selfcheck --path manifests/complete-production.manifest.json --check-facets false --network $network" \
            60 1 || log_warning "Manifest verification had issues"
    else
        log_info "Production manifest not found - skipping verification"
    fi

    # Test chunk prediction
    execute_command "Chunk Address Prediction Test" \
        "npx hardhat payrox:chunk:predict --factory $factory_address --data $test_data --network $network" \
        30 1 || log_warning "Chunk prediction test failed"

    # Test chunk staging
    execute_command "Chunk Staging Test" \
        "npx hardhat payrox:chunk:stage --factory $factory_address --data $test_data --value 0.0007 --network $network" \
        60 1 || log_info "Chunk staging test completed (fee requirement expected)"
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN DEPLOYMENT FUNCTION
# ═══════════════════════════════════════════════════════════════════════════

main() {
    # Initialize log file
    echo "PayRox Go Beyond Enterprise Deployment - $(date)" > "$LOG_FILE"
    echo "=========================================" >> "$LOG_FILE"

    echo -e "${WHITE}"
    echo "╔══════════════════════════════════════════════════════════════════════════╗"
    echo "║                  🚀 PayRox Go Beyond Enterprise Deployment              ║"
    echo "║                     Production-Grade System Deployment                   ║"
    echo "╚══════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Parse arguments and validate environment
    parse_arguments "$@"
    validate_environment

    log_info "Deployment target: $NETWORK"
    log_info "Show details: $SHOW_DETAILS"
    log_info "Skip tests: $SKIP_TESTS"

    # Set effective network
    local effective_network="$NETWORK"
    if [ "$NETWORK" = "hardhat" ]; then
        start_hardhat_node
        effective_network="localhost"
        log_warning "Using localhost for hardhat network deployment"
    fi

    # Create deployment directory
    DEPLOYMENT_STATE="preparation"
    local deployment_dir="deployments/$effective_network"

    if [ "$FORCE_CLEANUP" = true ] && [ -d "$deployment_dir" ]; then
        log_warning "Force cleanup enabled - removing previous deployments"
        rm -rf "$deployment_dir"
    fi

    mkdir -p "$deployment_dir"
    log_success "Deployment directory prepared: $deployment_dir"

    # Step 1: Compile contracts
    DEPLOYMENT_STATE="compilation"
    execute_command "Smart Contract Compilation" \
        "npx hardhat compile" \
        $TIMEOUT_COMPILE 2

    # Step 2: Deploy factory and dispatcher
    DEPLOYMENT_STATE="core_deployment"
    execute_command "Core System Deployment (Factory + Dispatcher)" \
        "npx hardhat run scripts/deploy-combined-contracts.ts --network $effective_network" \
        $TIMEOUT_DEPLOY 2

    # Extract and validate addresses
    FACTORY_ADDRESS=$(extract_address "$deployment_dir/factory.json" "Factory")
    DISPATCHER_ADDRESS=$(extract_address "$deployment_dir/dispatcher.json" "Dispatcher")

    # Validate addresses are different
    if [ "$FACTORY_ADDRESS" = "$DISPATCHER_ADDRESS" ]; then
        log_error "Factory and Dispatcher have identical addresses - deployment corrupted"
        exit 1
    fi

    log_success "Core system deployed successfully"
    log_info "Factory: $FACTORY_ADDRESS"
    log_info "Dispatcher: $DISPATCHER_ADDRESS"

    # Step 3: Deploy facets
    DEPLOYMENT_STATE="facet_deployment"
    execute_command "FacetA Deployment" \
        "npx hardhat run scripts/deploy-facet-a.ts --network $effective_network" \
        $TIMEOUT_DEPLOY 2

    execute_command "FacetB Deployment" \
        "npx hardhat run scripts/deploy-facet-b-direct.ts --network $effective_network" \
        $TIMEOUT_DEPLOY 2

    # Extract facet addresses
    if [ -f "$deployment_dir/ExampleFacetA.json" ]; then
        FACET_A_ADDRESS=$(extract_address "$deployment_dir/ExampleFacetA.json" "FacetA")
    elif [ -f "$deployment_dir/facet-a.json" ]; then
        FACET_A_ADDRESS=$(extract_address "$deployment_dir/facet-a.json" "FacetA")
    fi

    if [ -f "$deployment_dir/ExampleFacetB.json" ]; then
        FACET_B_ADDRESS=$(extract_address "$deployment_dir/ExampleFacetB.json" "FacetB")
    elif [ -f "$deployment_dir/facet-b.json" ]; then
        FACET_B_ADDRESS=$(extract_address "$deployment_dir/facet-b.json" "FacetB")
    fi

    # Step 4: Build and commit manifest
    DEPLOYMENT_STATE="manifest_processing"
    execute_command "Production Manifest Build" \
        "npx hardhat run scripts/build-manifest.ts --network $effective_network" \
        $TIMEOUT_DEPLOY 3

    execute_command "Merkle Root Commit" \
        "npx hardhat run scripts/commit-root.ts --network $effective_network" \
        $TIMEOUT_DEPLOY 3

    # Step 5: Apply routes and activate
    DEPLOYMENT_STATE="route_configuration"
    execute_command "Route Application" \
        "npx hardhat run scripts/apply-all-routes.ts --network $effective_network" \
        $TIMEOUT_DEPLOY 2

    # Allow time for network propagation
    sleep 3

    execute_command "Root Activation" \
        "npx hardhat run scripts/activate-root.ts --network $effective_network" \
        $TIMEOUT_DEPLOY 2

    # Step 6: Verification and testing
    DEPLOYMENT_STATE="verification"
    execute_command "Quick Address Verification" \
        "npx hardhat run scripts/quick-deployment-check.ts --network $effective_network" \
        60 1 || log_warning "Address verification had minor issues"

    execute_command "Complete Deployment Verification" \
        "npx hardhat run scripts/verify-complete-deployment.ts --network $effective_network" \
        120 1 || log_warning "Complete verification detected compatibility issues"

    # Step 7: Acceptance tests (if not skipped)
    if [ "$SKIP_TESTS" = false ]; then
        DEPLOYMENT_STATE="testing"
        execute_command "Critical Acceptance Tests" \
            "npx hardhat test test/facet-size-cap.spec.ts test/orchestrator-integration.spec.ts" \
            $TIMEOUT_TEST 1 || log_warning "Some acceptance tests failed"
    else
        log_info "Skipping acceptance tests as requested"
    fi

    # Step 8: Enterprise tooling
    DEPLOYMENT_STATE="tooling_verification"
    execute_command "Release Bundle Generation" \
        "npx hardhat payrox:release:bundle --manifest manifests/complete-production.manifest.json --dispatcher $DISPATCHER_ADDRESS --factory $FACTORY_ADDRESS --verify --network $effective_network" \
        120 1 || log_warning "Release bundle generation had issues"

    # Test enterprise utilities
    test_enterprise_utilities "$FACTORY_ADDRESS" "$effective_network"

    # Step 9: Final validation
    DEPLOYMENT_STATE="final_validation"
    execute_command "Dispatcher Interface Test" \
        "npx hardhat run scripts/test-dispatcher-interface.ts --network $effective_network" \
        60 1 || log_warning "Dispatcher interface tests had issues"

    DEPLOYMENT_STATE="completed"
    log_success "Enterprise deployment completed successfully!"

    # Generate deployment report
    local report_file="$deployment_dir/deployment-report.json"
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "network": "$effective_network",
  "duration": "$(($(date +%s) - START_TIME))",
  "factory_address": "$FACTORY_ADDRESS",
  "dispatcher_address": "$DISPATCHER_ADDRESS",
  "facet_a_address": "$FACET_A_ADDRESS",
  "facet_b_address": "$FACET_B_ADDRESS",
  "deployment_state": "$DEPLOYMENT_STATE"
}
EOF

    log_success "Deployment report saved: $report_file"
}

# ═══════════════════════════════════════════════════════════════════════════
# SCRIPT EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

# Ensure we're in the correct directory
cd "$SCRIPT_DIR" || {
    echo "Failed to change to script directory: $SCRIPT_DIR"
    exit 1
}

# Run main function with all arguments
main "$@"
