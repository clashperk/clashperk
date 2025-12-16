#!/bin/bash
set -e

# Path to keyfile
KEYFILE="/data/configdb/keyFile.pem"

# Generate keyfile if it doesn't exist
if [ ! -f "$KEYFILE" ]; then
    echo "Generating keyFile at $KEYFILE"
    openssl rand -base64 756 > "$KEYFILE"
    chmod 400 "$KEYFILE"
    chown 999:999 "$KEYFILE"
fi

# Function to initialize replica set
init_replica_set() {
    echo "Waiting for MongoDB to become available..."
    # Loop until we can connect
    until mongosh --port 27017 --eval "print(\"waited for connection\")" > /dev/null 2>&1; do
        sleep 2
    done

    echo "MongoDB is up. Sleeping 5s before RS initiation..."
    sleep 5

    echo "Initiating Replica Set..."
    # Connect and initiate
    mongosh --port 27017 \
        -u "$MONGO_INITDB_ROOT_USERNAME" \
        -p "$MONGO_INITDB_ROOT_PASSWORD" \
        --authenticationDatabase admin \
        --eval 'try { rs.status() } catch (e) { rs.initiate({_id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }]}) }'
}

# Run init in background
init_replica_set &

# Pass arguments to the official entrypoint
# We use exec so that mongod becomes PID 1 (or the child of this script effectively replacing it if we weren't in a subshell, but here we just want it to take over)
# Actually, since we backgrounded init_replica_set, we proceed to exec.
exec /usr/local/bin/docker-entrypoint.sh "$@"
