#!/bin/bash
################################################################################
# Encryption Manager
# Handles encryption/decryption of sensitive files
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
CONFIG_DIR="/etc/project-guardian"
STATE_DIR="/var/lib/project-guardian"
KEY_FILE="$STATE_DIR/encryption.key"
LOG_FILE="/var/log/guardian.log"

# Logging functions
log() {
    echo -e "${GREEN}[ENCRYPTION]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ENCRYPTION] $1" >> "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    echo "$(date '+%Y-%m-%d %H:%M:%S') [ERROR] $1" >> "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [WARN] $1" >> "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [INFO] $1" >> "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root!"
        exit 1
    fi
}

# Initialize state directory
init_state() {
    if [[ ! -d "$STATE_DIR" ]]; then
        mkdir -p "$STATE_DIR"
        chmod 700 "$STATE_DIR"
        log "Created state directory: $STATE_DIR"
    fi
}

# Generate encryption key
generate_key() {
    log "Generating encryption key..."
    
    if [[ -f "$KEY_FILE" ]]; then
        warn "Encryption key already exists, backing up..."
        cp "$KEY_FILE" "$KEY_FILE.backup.$(date +%s)"
    fi
    
    # Generate a strong 256-bit key
    openssl rand -base64 32 > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    
    log "Encryption key generated: $KEY_FILE"
}

# Load encryption key
load_key() {
    if [[ ! -f "$KEY_FILE" ]]; then
        error "Encryption key not found: $KEY_FILE"
        error "Run 'encryption-manager.sh generate' first"
        exit 1
    fi
    
    # Read the key
    cat "$KEY_FILE"
}

# Encrypt a single file
encrypt_file() {
    local file_path="$1"
    
    if [[ ! -f "$file_path" ]]; then
        warn "File not found: $file_path"
        return 1
    fi
    
    # Skip if already encrypted (has .enc extension)
    if [[ "$file_path" == *.enc ]]; then
        info "File already encrypted: $file_path"
        return 0
    fi
    
    local encrypted_path="${file_path}.enc"
    local key=$(load_key)
    
    info "Encrypting: $file_path"
    
    # Encrypt the file
    openssl enc -aes-256-cbc -salt -in "$file_path" -out "$encrypted_path" -k "$key"
    
    if [[ $? -eq 0 ]]; then
        # Remove original file
        rm -f "$file_path"
        log "Encrypted successfully: $file_path"
        return 0
    else
        error "Failed to encrypt: $file_path"
        rm -f "$encrypted_path"
        return 1
    fi
}

# Decrypt a single file
decrypt_file() {
    local encrypted_path="$1"
    
    if [[ ! -f "$encrypted_path" ]]; then
        warn "Encrypted file not found: $encrypted_path"
        return 1
    fi
    
    # Check if it's actually encrypted
    if [[ "$encrypted_path" != *.enc ]]; then
        warn "File doesn't appear to be encrypted: $encrypted_path"
        return 1
    fi
    
    local original_path="${encrypted_path%.enc}"
    local key=$(load_key)
    
    info "Decrypting: $encrypted_path"
    
    # Decrypt the file
    openssl enc -aes-256-cbc -d -salt -in "$encrypted_path" -out "$original_path" -k "$key"
    
    if [[ $? -eq 0 ]]; then
        # Remove encrypted file
        rm -f "$encrypted_path"
        log "Decrypted successfully: $encrypted_path"
        return 0
    else
        error "Failed to decrypt: $encrypted_path"
        rm -f "$original_path"
        return 1
    fi
}

# Encrypt files matching pattern
encrypt_pattern() {
    local pattern="$1"
    local base_dir="${2:-/opt/videomakerfree_v2}"
    
    log "Encrypting files matching pattern: $pattern in $base_dir"
    
    local count=0
    local encrypted_count=0
    
    # Find files matching pattern
    while IFS= read -r -d '' file; do
        ((count++))
        if encrypt_file "$file"; then
            ((encrypted_count++))
        fi
    done < <(find "$base_dir" -type f -name "$pattern" -print0 2>/dev/null)
    
    log "Processed $count files, encrypted $encrypted_count files"
}

# Decrypt files matching pattern
decrypt_pattern() {
    local pattern="$1"
    local base_dir="${2:-/opt/videomakerfree_v2}"
    
    log "Decrypting files matching pattern: $pattern in $base_dir"
    
    local count=0
    local decrypted_count=0
    
    # Find encrypted files matching pattern
    while IFS= read -r -d '' file; do
        ((count++))
        if decrypt_file "$file"; then
            ((decrypted_count++))
        fi
    done < <(find "$base_dir" -type f -name "${pattern}.enc" -print0 2>/dev/null)
    
    log "Processed $count files, decrypted $decrypted_count files"
}

# Encrypt all sensitive files based on config
encrypt_all() {
    log "Encrypting all sensitive files..."
    
    if [[ ! -f "$CONFIG_DIR/config.json" ]]; then
        error "Config file not found: $CONFIG_DIR/config.json"
        exit 1
    fi
    
    local patterns=$(jq -r '.encrypted_files[]?' "$CONFIG_DIR/config.json" 2>/dev/null)
    
    if [[ -z "$patterns" ]]; then
        warn "No encrypted file patterns found in config"
        return 0
    fi
    
    local project_path=$(jq -r '.project_path // "/opt/videomakerfree_v2"' "$CONFIG_DIR/config.json")
    
    echo "$patterns" | while read -r pattern; do
        if [[ -n "$pattern" ]]; then
            encrypt_pattern "$pattern" "$project_path"
        fi
    done
    
    log "All sensitive files encrypted"
}

# Decrypt all sensitive files
decrypt_all() {
    log "Decrypting all sensitive files..."
    
    if [[ ! -f "$CONFIG_DIR/config.json" ]]; then
        error "Config file not found: $CONFIG_DIR/config.json"
        exit 1
    fi
    
    local patterns=$(jq -r '.encrypted_files[]?' "$CONFIG_DIR/config.json" 2>/dev/null)
    
    if [[ -z "$patterns" ]]; then
        warn "No encrypted file patterns found in config"
        return 0
    fi
    
    local project_path=$(jq -r '.project_path // "/opt/videomakerfree_v2"' "$CONFIG_DIR/config.json")
    
    echo "$patterns" | while read -r pattern; do
        if [[ -n "$pattern" ]]; then
            decrypt_pattern "$pattern" "$project_path"
        fi
    done
    
    log "All sensitive files decrypted"
}

# Check encryption status
status() {
    log "Checking encryption status..."
    
    if [[ ! -f "$KEY_FILE" ]]; then
        warn "No encryption key found"
        return 1
    fi
    
    if [[ ! -f "$CONFIG_DIR/config.json" ]]; then
        warn "No config file found"
        return 1
    fi
    
    local project_path=$(jq -r '.project_path // "/opt/videomakerfree_v2"' "$CONFIG_DIR/config.json")
    local patterns=$(jq -r '.encrypted_files[]?' "$CONFIG_DIR/config.json" 2>/dev/null)
    
    echo "Encryption Key: $(basename "$KEY_FILE")"
    echo "Project Path: $project_path"
    echo ""
    echo "File Status:"
    
    if [[ -n "$patterns" ]]; then
        echo "$patterns" | while read -r pattern; do
            if [[ -n "$pattern" ]]; then
                local encrypted_count=$(find "$project_path" -type f -name "${pattern}.enc" 2>/dev/null | wc -l)
                local original_count=$(find "$project_path" -type f -name "$pattern" 2>/dev/null | wc -l)
                
                echo "  $pattern: $original_count original, $encrypted_count encrypted"
            fi
        done
    else
        echo "  No patterns configured"
    fi
}

# Show usage
usage() {
    echo "Usage: $0 {generate|encrypt|decrypt|encrypt-pattern|decrypt-pattern|encrypt-all|decrypt-all|status}"
    echo ""
    echo "Commands:"
    echo "  generate              Generate new encryption key"
    echo "  encrypt FILE          Encrypt a single file"
    echo "  decrypt FILE          Decrypt a single file"
    echo "  encrypt-pattern PATTERN [DIR]  Encrypt files matching pattern"
    echo "  decrypt-pattern PATTERN [DIR]  Decrypt files matching pattern"
    echo "  encrypt-all           Encrypt all sensitive files (from config)"
    echo "  decrypt-all           Decrypt all sensitive files (from config)"
    echo "  status                Show encryption status"
    echo ""
    echo "Examples:"
    echo "  $0 generate"
    echo "  $0 encrypt /path/to/sensitive.txt"
    echo "  $0 encrypt-pattern '*.key' /opt/videomakerfree_v2"
    echo "  $0 encrypt-all"
    echo "  $0 status"
}

# Main function
main() {
    check_root
    init_state
    
    case "${1:-}" in
        generate)
            generate_key
            ;;
        encrypt)
            if [[ -z "${2:-}" ]]; then
                error "File path required"
                usage
                exit 1
            fi
            encrypt_file "$2"
            ;;
        decrypt)
            if [[ -z "${2:-}" ]]; then
                error "Encrypted file path required"
                usage
                exit 1
            fi
            decrypt_file "$2"
            ;;
        encrypt-pattern)
            if [[ -z "${2:-}" ]]; then
                error "Pattern required"
                usage
                exit 1
            fi
            encrypt_pattern "$2" "${3:-}"
            ;;
        decrypt-pattern)
            if [[ -z "${2:-}" ]]; then
                error "Pattern required"
                usage
                exit 1
            fi
            decrypt_pattern "$2" "${3:-}"
            ;;
        encrypt-all)
            encrypt_all
            ;;
        decrypt-all)
            decrypt_all
            ;;
        status)
            status
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
