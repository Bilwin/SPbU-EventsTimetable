#!/bin/sh
set -eu

if [ ! -d node_modules ]; then
  echo "Installing Node dependencies..."
  npm install
fi

exec "$@"
