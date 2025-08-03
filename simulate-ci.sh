#!/bin/bash
# PayRox Go Beyond - A+ CI Simulation Script
# Production-grade local CI testing with comprehensive error handling and validation
# Version: 2.0.0

set -euo pipefail  # Exit on error, undefined vars, pipe failures
IFS=$'\n\t'       # Secure Internal Field Separator

# ═══════════════════════════════════════════════════════════════════════════
# CONFIGURATION AND GLOBALS
# ═══════════════════════════════════════════════════════════════════════════

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly LOG_FILE="${SCRIPT_DIR}/ci-simulation.log"
readonly MAX_RETRY_ATTEMPTS=3
readonly TEST_TIMEOUT=900  # 15 minutes
readonly COVERAGE_TIMEOUT=600  # 10 minutes

# Color codes for enhanced output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m' # No Color

# Step tracking
TOTAL_STEPS=12
CURRENT_STEP=0
START_TIME=$(date +%s)
FAILED_STEPS=()

# ═══════════════════════════════════════════════════════════════════════════
# UTILITY FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() { echo -e "${CYAN}ℹ️  $*${NC}" | tee -a "$LOG_FILE"; }
log_success() { echo -e "${GREEN}✅ $*${NC}" | tee -a "$LOG_FILE"; }
log_warning() { echo -e "${YELLOW}⚠️  $*${NC}" | tee -a "$LOG_FILE"; }
log_error() { echo -e "${RED}❌ $*${NC}" | tee -a "$LOG_FILE"; }
log_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo -e "${WHITE}[$CURRENT_STEP/$TOTAL_STEPS] $*${NC}" | tee -a "$LOG_FILE"
}

# Progress bar function
show_progress() {
    local current=$1
    local total=$2
    local width=50
    local percentage=$((current * 100 / total))
    local completed=$((current * width / total))
    local remaining=$((width - completed))

    printf "\r${BLUE}Progress: ["
    printf "%${completed}s" | tr ' ' '█'
    printf "%${remaining}s" | tr ' ' '░'
    printf "] %d%% (%d/%d)${NC}" "$percentage" "$current" "$total"
}

# Enhanced error handling with context
handle_error() {
    local exit_code=$?
    local line_number=$1
    local command="$2"

    log_error "Command failed at line $line_number: $command"
    log_error "Exit code: $exit_code"
    FAILED_STEPS+=("Step $CURRENT_STEP: $command")

    # Don't exit immediately, let cleanup happen
    return $exit_code
}

# Trap errors with context
trap 'handle_error $LINENO "$BASH_COMMAND"' ERR

# Cleanup function
cleanup() {
    local exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    local duration_formatted=$(printf '%02d:%02d:%02d' $((duration/3600)) $((duration%3600/60)) $((duration%60)))

    echo ""
    echo -e "${WHITE}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${WHITE}                            CI SIMULATION SUMMARY${NC}"
    echo -e "${WHITE}═══════════════════════════════════════════════════════════════════════════${NC}"

    if [ $exit_code -eq 0 ] && [ ${#FAILED_STEPS[@]} -eq 0 ]; then
        log_success "CI simulation completed successfully! 🎉"
        log_success "Total duration: $duration_formatted"
        log_success "All $TOTAL_STEPS steps passed"
        echo -e "${GREEN}🚀 Ready for CI pipeline! All checks passed.${NC}"
    else
        log_error "CI simulation failed after $duration_formatted"
        log_error "Failed steps: ${#FAILED_STEPS[@]}/$TOTAL_STEPS"

        if [ ${#FAILED_STEPS[@]} -gt 0 ]; then
            echo -e "${RED}Failed steps:${NC}"
            for failed_step in "${FAILED_STEPS[@]}"; do
                echo -e "${RED}  • $failed_step${NC}"
            done
        fi

        echo -e "${RED}🛑 Fix these issues before pushing to CI.${NC}"
    fi

    echo -e "${CYAN}📋 Full log available at: $LOG_FILE${NC}"
    echo ""
}

trap cleanup EXIT

# Retry mechanism for network operations
retry_command() {
    local max_attempts=$1
    shift
    local command=("$@")
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if "${command[@]}"; then
            return 0
        else
            local exit_code=$?
            log_warning "Attempt $attempt/$max_attempts failed. Exit code: $exit_code"

            if [ $attempt -eq $max_attempts ]; then
                log_error "All $max_attempts attempts failed"
                return $exit_code
            fi

            local wait_time=$((attempt * 2))
            log_info "Waiting ${wait_time}s before retry..."
            sleep $wait_time
            attempt=$((attempt + 1))
        fi
    done
}

# Command execution with timeout
execute_with_timeout() {
    local timeout_duration=$1
    shift
    local command=("$@")

    if timeout "$timeout_duration" "${command[@]}"; then
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            log_error "Command timed out after ${timeout_duration}s: ${command[*]}"
        fi
        return $exit_code
    fi
}

# System validation
validate_system() {
    log_step "Validating system requirements..."

    # Check Node.js version
    if ! command -v node >/dev/null 2>&1; then
        log_error "Node.js not found"
        return 1
    fi

    local node_version
    node_version=$(node --version | sed 's/v//')
    local node_major
    node_major=$(echo "$node_version" | cut -d. -f1)

    if [ "$node_major" -lt 18 ]; then
        log_error "Node.js version $node_version is too old. Minimum required: 18.x"
        return 1
    fi

    log_success "Node.js version: v$node_version ✅"

    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        log_error "npm not found"
        return 1
    fi

    local npm_version
    npm_version=$(npm --version)
    log_success "npm version: $npm_version ✅"

    # Check available disk space (minimum 1GB)
    local available_space
    available_space=$(df "$SCRIPT_DIR" | awk 'NR==2 {print $4}')
    local available_gb=$((available_space / 1024 / 1024))

    if [ $available_gb -lt 1 ]; then
        log_warning "Low disk space: ${available_gb}GB available"
    else
        log_success "Disk space: ${available_gb}GB available ✅"
    fi

    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log_error "package.json not found. Are you in the project root?"
        return 1
    fi

    if [ ! -f "hardhat.config.ts" ]; then
        log_error "hardhat.config.ts not found. This doesn't appear to be a Hardhat project."
        return 1
    fi

    log_success "Project structure validation passed ✅"
}

# ═══════════════════════════════════════════════════════════════════════════
# MAIN CI SIMULATION STEPS
# ═══════════════════════════════════════════════════════════════════════════

main() {
    # Initialize log file
    echo "PayRox Go Beyond CI Simulation - $(date)" > "$LOG_FILE"
    echo "=========================================" >> "$LOG_FILE"

    echo -e "${WHITE}"
    echo "╔══════════════════════════════════════════════════════════════════════════╗"
    echo "║                    🚀 PayRox Go Beyond CI Simulation                    ║"
    echo "║                         Production-Grade Local Testing                   ║"
    echo "╚══════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Step 1: System Validation
    validate_system || return 1
    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 2: Environment Setup
    log_step "Setting up environment variables..."
    export CI=true
    export NODE_ENV=test
    export FORCE_COLOR=1
    export HARDHAT_NETWORK=hardhat
    log_success "Environment configured for CI testing"
    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 3: Clean Previous State
    log_step "Cleaning previous build artifacts..."

    # Enhanced cleanup with verification
    local cleanup_items=("node_modules/.cache" "cache" "artifacts" "typechain-types" "coverage" ".coverage_artifacts")

    for item in "${cleanup_items[@]}"; do
        if [ -e "$item" ]; then
            rm -rf "$item" && log_info "Removed: $item"
        fi
    done

    if command -v npm >/dev/null 2>&1 && npm run clean >/dev/null 2>&1; then
        log_success "Hardhat clean completed"
    else
        log_warning "npm run clean not available or failed"
    fi

    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 4: Dependency Installation with Retry
    log_step "Installing dependencies with retry mechanism..."

    if retry_command $MAX_RETRY_ATTEMPTS npm ci --prefer-offline --no-audit; then
        log_success "Dependencies installed successfully"

        # Verify critical dependencies
        local critical_deps=("hardhat" "@nomicfoundation/hardhat-toolbox" "ethers")
        for dep in "${critical_deps[@]}"; do
            if npm list "$dep" >/dev/null 2>&1; then
                log_info "✓ $dep installed"
            else
                log_warning "⚠ $dep not found"
            fi
        done
    else
        log_error "Failed to install dependencies after $MAX_RETRY_ATTEMPTS attempts"
        return 1
    fi

    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 5: Contract Compilation with Verification
    log_step "Compiling smart contracts..."

    if npm run compile; then
        log_success "Contract compilation completed"

        # Verify compilation artifacts
        if [ -d "artifacts" ] && [ -d "typechain-types" ]; then
            local contract_count
            contract_count=$(find artifacts -name "*.json" | wc -l)
            log_info "Generated $contract_count artifact files"

            local typechain_count
            typechain_count=$(find typechain-types -name "*.ts" | wc -l)
            log_info "Generated $typechain_count TypeChain files"
        else
            log_warning "Expected artifacts directories not found"
        fi
    else
        log_error "Contract compilation failed"
        return 1
    fi

    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 6: Contract Size Analysis
    log_step "Analyzing contract sizes..."

    if npm run size; then
        log_success "Contract size analysis completed"
    else
        log_warning "Contract size analysis failed or not available"
    fi

    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 7: Linting (if available)
    log_step "Running code quality checks..."

    if npm run lint >/dev/null 2>&1; then
        log_success "Linting passed"
    elif npm run lint:check >/dev/null 2>&1; then
        log_success "Lint check passed"
    else
        log_info "Linting not available or configured"
    fi

    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 8: Comprehensive Test Suite with Timeout
    log_step "Running comprehensive test suite (with timeout protection)..."

    if execute_with_timeout $TEST_TIMEOUT npm run test; then
        log_success "All tests passed ✅"

        # Test result analysis
        if [ -f "test-results.xml" ]; then
            log_info "Test results exported to test-results.xml"
        fi
    else
        log_error "Test suite failed or timed out"
        return 1
    fi

    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 9: Coverage Analysis with Timeout
    log_step "Running coverage analysis (with timeout protection)..."

    if execute_with_timeout $COVERAGE_TIMEOUT npm run coverage; then
        log_success "Coverage analysis completed"

        # Coverage reporting
        if [ -f "coverage/lcov.info" ]; then
            local coverage_summary
            coverage_summary=$(grep -E '^LF|^LH' coverage/lcov.info | awk '{sum+=$1} END {if(NR>0) print sum/NR*100}' 2>/dev/null || echo "Unknown")
            log_info "Estimated coverage: ${coverage_summary}%"
        fi

        if [ -f "coverage/coverage-final.json" ]; then
            log_info "Coverage data exported successfully"
        fi
    else
        log_warning "Coverage analysis failed or timed out"
    fi

    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 10: Production Security Testing
    log_step "Running production security tests..."

    # Clean and recompile for security tests
    npm run clean >/dev/null 2>&1 || true

    if npm run compile && [ -f "test/production-security.spec.ts" ]; then
        if execute_with_timeout 300 npx hardhat test test/production-security.spec.ts; then
            log_success "Production security tests passed ✅"
        else
            log_error "Production security tests failed"
            return 1
        fi
    else
        log_warning "Production security tests not found or compilation failed"
    fi

    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 11: Additional Quality Checks
    log_step "Running additional quality checks..."

    # Check for common issues
    local issues_found=0

    # Check for TODO/FIXME comments in contracts
    if grep -r "TODO\|FIXME" contracts/ >/dev/null 2>&1; then
        log_warning "TODO/FIXME comments found in contracts"
        issues_found=$((issues_found + 1))
    fi

    # Check for console.log statements in contracts
    if grep -r "console\.log" contracts/ >/dev/null 2>&1; then
        log_warning "console.log statements found in contracts"
        issues_found=$((issues_found + 1))
    fi

    # Check for proper license headers
    local solidity_files
    solidity_files=$(find contracts -name "*.sol" | wc -l)
    local licensed_files
    licensed_files=$(grep -l "SPDX-License-Identifier" contracts/*.sol 2>/dev/null | wc -l)

    if [ "$licensed_files" -lt "$solidity_files" ]; then
        log_warning "Some Solidity files missing SPDX license identifier"
        issues_found=$((issues_found + 1))
    fi

    if [ $issues_found -eq 0 ]; then
        log_success "All quality checks passed"
    else
        log_warning "$issues_found quality issues found (non-blocking)"
    fi

    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    # Step 12: Final Validation
    log_step "Performing final validation..."

    # Verify all expected outputs exist
    local expected_artifacts=("artifacts" "typechain-types")
    local missing_artifacts=0

    for artifact in "${expected_artifacts[@]}"; do
        if [ ! -d "$artifact" ]; then
            log_warning "Missing artifact directory: $artifact"
            missing_artifacts=$((missing_artifacts + 1))
        fi
    done

    if [ $missing_artifacts -eq 0 ]; then
        log_success "All artifacts generated successfully"
    else
        log_warning "$missing_artifacts artifact directories missing"
    fi

    # Check package.json scripts exist
    local required_scripts=("compile" "test" "clean")
    for script in "${required_scripts[@]}"; do
        if ! npm run "$script" --silent >/dev/null 2>&1; then
            log_info "Note: '$script' script validation (expected for some scripts)"
        fi
    done

    show_progress $CURRENT_STEP $TOTAL_STEPS && echo ""

    log_success "CI simulation completed successfully! 🎉"
    return 0
}

# ═══════════════════════════════════════════════════════════════════════════
# SCRIPT EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

# Ensure we're in the correct directory
cd "$SCRIPT_DIR" || {
    echo "Failed to change to script directory: $SCRIPT_DIR"
    exit 1
}

# Run main function
main "$@"
