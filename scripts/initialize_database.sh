#!/bin/bash
# Initialize MySQL database with schema and seed data

set -e

echo "=========================================="
echo "Initializing MySQL Database"
echo "=========================================="

# Database credentials (from .env)
DB_HOST="192.168.0.4"
DB_PORT="3306"
DB_NAME="default_db"
DB_USER="gen_user"
DB_PASSWORD="n@!fOXG|P*lQ9"

# Test connection
echo "🔍 Testing database connection..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
else
    echo "❌ Database connection failed!"
    exit 1
fi

# Load schema
echo "📋 Loading database schema..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/schema_mysql.sql

# Load seed data
echo "🌱 Loading seed data..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < database/seed_data_mysql.sql

# Verify setup
echo "🔍 Verifying setup..."
TABLES=$(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '$DB_NAME';")

echo ""
echo "=========================================="
echo "✅ Database initialized successfully!"
echo "=========================================="
echo "Tables created: $TABLES"
echo ""
