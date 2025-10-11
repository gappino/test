#!/bin/bash
################################################################################
# Encryption Manager - File Encryption/Decryption with Runtime Key Management  
# Project: https://github.com/gappino/test
################################################################################

set -euo pipefail

# Paths
CONFIG_DIR="/etc/project-guardian"
STATE_DIR="/var/lib/project-guardian"
KEY_FILE="$STATE_DIR/encryption.key"
ENCRYPTED_MARKER=".encrypted"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[ENCRYPTION]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Generate encryption key
generate_key() {
    log "Generating new encryption key..."
    
    # Create state directory if not exists
    mkdir -p "$STATE_DIR"
    chmod 700 "$STATE_DIR"
    
    # Generate 256-bit random key
    openssl rand -base64 32 > "$KEY_FILE"
    chmod 600 "$KEY_FILE"
    
    log "Encryption key generated successfully"
}

# Encrypt a file
encrypt_file() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        error "File not found: $file"
        return 1
    fi
    
    # Check if already encrypted
    if [[ -f "${file}${ENCRYPTED_MARKER}" ]]; then
        warn "File already encrypted: $file"
        return 0
    fi
    
    log "Encrypting: $file"
    
    # Backup original
    cp "$file" "${file}.original"
    
    # Encrypt with AES-256-CBC
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
        -in "$file" \
        -out "${file}.enc" \
        -pass file:"$KEY_FILE"
    
    # Replace original with encrypted version
    mv "${file}.enc" "$file"
    
    # Mark as encrypted
    touch "${file}${ENCRYPTED_MARKER}"
    
    log "Encrypted successfully: $file"
}

# Decrypt a file
decrypt_file() {
    local file="$1"
    
    if [[ ! -f "$file" ]]; then
        error "File not found: $file"
        return 1
    fi
    
    # Check if encrypted
    if [[ ! -f "${file}${ENCRYPTED_MARKER}" ]]; then
        warn "File is not encrypted: $file"
        return 0
    fi
    
    log "Decrypting: $file"
    
    # Decrypt
    openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
        -in "$file" \
        -out "${file}.dec" \
        -pass file:"$KEY_FILE"
    
    # Replace with decrypted version
    mv "${file}.dec" "$file"
    
    # Remove encrypted marker
    rm -f "${file}${ENCRYPTED_MARKER}"
    
    log "Decrypted successfully: $file"
}

# Encrypt directory pattern
encrypt_pattern() {
    local pattern="$1"
    local base_dir="$2"
    
    log "Encrypting files matching pattern: $pattern in $base_dir"
    
    find "$base_dir" -path "$base_dir/$pattern" -type f 2>/dev/null | while read -r file; do
        encrypt_file "$file"
    done
}

# Decrypt directory pattern
decrypt_pattern() {
    local pattern="$1"
    local base_dir="$2"
    
    log "Decrypting files matching pattern: $pattern in $base_dir"
    
    find "$base_dir" -path "$base_dir/$pattern" -type f 2>/dev/null | while read -r file; do
        if [[ -f "${file}${ENCRYPTED_MARKER}" ]]; then
            decrypt_file "$file"
        fi
    done
}

# Rotate encryption key
rotate_key() {
    log "Starting key rotation..."
    
    # Read config to get project path and patterns
    local config_file="$CONFIG_DIR/config.json"
    if [[ ! -f "$config_file" ]]; then
        error "Config file not found: $config_file"
        return 1
    fi
    
    local project_path=$(jq -r '.project_path' "$config_file")
    
    # Decrypt all files with old key
    log "Decrypting with old key..."
    find "$project_path" -name "*${ENCRYPTED_MARKER}" 2>/dev/null | while read -r marker; do
        local file="${marker%${ENCRYPTED_MARKER}}"
        decrypt_file "$file"
    done
    
    # Generate new key
    mv "$KEY_FILE" "${KEY_FILE}.old"
    generate_key
    
    # Re-encrypt with new key
    log "Re-encrypting with new key..."
    local patterns=$(jq -r '.encrypted_files[]' "$config_file")
    echo "$patterns" | while read -r pattern; do
        encrypt_pattern "$pattern" "$project_path"
    done
    
    # Remove old key
    shred -vfz -n 3 "${KEY_FILE}.old" 2>/dev/null || rm -f "${KEY_FILE}.old"
    
    log "Key rotation completed successfully"
}

# Load key into memory (tmpfs)
load_key_to_memory() {
    log "Loading encryption key to memory..."
    
    # Create tmpfs mount if not exists
    if ! mountpoint -q /dev/shm/guardian-keys 2>/dev/null; then
        mkdir -p /dev/shm/guardian-keys
        mount -t tmpfs -o size=1M,mode=700 tmpfs /dev/shm/guardian-keys
    fi
    
    # Copy key to memory
    cp "$KEY_FILE" /dev/shm/guardian-keys/encryption.key
    chmod 600 /dev/shm/guardian-keys/encryption.key
    
    log "Key loaded to memory successfully"
}

# Clear key from memory
clear_key_from_memory() {
    log "Clearing encryption key from memory..."
    
    if [[ -d /dev/shm/guardian-keys ]]; then
        shred -vfz -n 3 /dev/shm/guardian-keys/* 2>/dev/null || true
        umount /dev/shm/guardian-keys 2>/dev/null || true
        rm -rf /dev/shm/guardian-keys
    fi
    
    log "Key cleared from memory"
}

# Main function
main() {
    local action="${1:-}"
    
    case "$action" in
        generate)
            generate_key
            ;;
        encrypt)
            if [[ $# -lt 2 ]]; then
                error "Usage: $0 encrypt <file>"
                exit 1
            fi
            encrypt_file "$2"
            ;;
        decrypt)
            if [[ $# -lt 2 ]]; then
                error "Usage: $0 decrypt <file>"
                exit 1
            fi
            decrypt_file "$2"
            ;;
        encrypt-pattern)
            if [[ $# -lt 3 ]]; then
                error "Usage: $0 encrypt-pattern <pattern> <base_dir>"
                exit 1
            fi
            encrypt_pattern "$2" "$3"
            ;;
        decrypt-pattern)
            if [[ $# -lt 3 ]]; then
                error "Usage: $0 decrypt-pattern <pattern> <base_dir>"
                exit 1
            fi
            decrypt_pattern "$2" "$3"
            ;;
        rotate)
            rotate_key
            ;;
        load-memory)
            load_key_to_memory
            ;;
        clear-memory)
            clear_key_from_memory
            ;;
        *)
            echo "Usage: $0 {generate|encrypt|decrypt|encrypt-pattern|decrypt-pattern|rotate|load-memory|clear-memory}"
            exit 1
            ;;
    esac
}

main "$@"
