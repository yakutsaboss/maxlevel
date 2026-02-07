#!/bin/bash

# Database Setup Script for Telegram RPG Quest Bot
# This script creates the PostgreSQL database and initializes it with schema and seed data

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Load environment variables from .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Loaded environment variables from .env${NC}"
else
    echo -e "${RED}✗ .env file not found${NC}"
    echo -e "${YELLOW}  Please create a .env file with DATABASE_URL${NC}"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ DATABASE_URL not set in .env${NC}"
    echo -e "${YELLOW}  Example: DATABASE_URL=postgresql://user:password@localhost:5432/telegram_rpg${NC}"
    exit 1
fi

echo -e "${YELLOW}Database Setup for Telegram RPG Quest Bot${NC}"
echo -e "=========================================="
echo ""

# Parse DATABASE_URL to extract connection details
# Format: postgresql://user:password@host:port/dbname
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p')

echo -e "${YELLOW}Connection Details:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Check if PostgreSQL is accessible
echo -e "${YELLOW}1. Checking PostgreSQL connection...${NC}"
if PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c '\q' 2>/dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is accessible${NC}"
else
    echo -e "${RED}✗ Cannot connect to PostgreSQL${NC}"
    echo -e "${YELLOW}  Please ensure PostgreSQL is running and credentials are correct${NC}"
    exit 1
fi

# Check if database exists
echo -e "${YELLOW}2. Checking if database exists...${NC}"
if PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}  Database '$DB_NAME' already exists${NC}"
    read -p "  Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}  Dropping existing database...${NC}"
        PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        echo -e "${GREEN}✓ Database dropped${NC}"
    else
        echo -e "${YELLOW}  Skipping database creation. Will run migrations on existing database.${NC}"
    fi
fi

# Create database if it doesn't exist
if ! PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}  Creating database '$DB_NAME'...${NC}"
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✓ Database created${NC}"
fi

# Run schema.sql
echo -e "${YELLOW}3. Creating database schema...${NC}"
if [ ! -f "database/schema.sql" ]; then
    echo -e "${RED}✗ database/schema.sql not found${NC}"
    exit 1
fi
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema.sql > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Schema created successfully${NC}"
else
    echo -e "${RED}✗ Error creating schema${NC}"
    exit 1
fi

# Run seed_data.sql
echo -e "${YELLOW}4. Inserting seed data...${NC}"
if [ ! -f "database/seed_data.sql" ]; then
    echo -e "${RED}✗ database/seed_data.sql not found${NC}"
    exit 1
fi
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/seed_data.sql > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Seed data inserted successfully${NC}"
else
    echo -e "${RED}✗ Error inserting seed data${NC}"
    exit 1
fi

# Verification
echo -e "${YELLOW}5. Verifying setup...${NC}"
TABLE_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
MODE_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM modes;" | xargs)
ACHIEVEMENT_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM achievements;" | xargs)
QUEST_COUNT=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM quests;" | xargs)

echo -e "  Tables created: $TABLE_COUNT"
echo -e "  Modes: $MODE_COUNT"
echo -e "  Achievements: $ACHIEVEMENT_COUNT"
echo -e "  Quest templates: $QUEST_COUNT"
echo ""

if [ $TABLE_COUNT -gt 0 ] && [ $MODE_COUNT -gt 0 ] && [ $ACHIEVEMENT_COUNT -gt 0 ] && [ $QUEST_COUNT -gt 0 ]; then
    echo -e "${GREEN}=========================================="
    echo -e "✓ Database setup completed successfully!"
    echo -e "==========================================${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Update your .env file with TELEGRAM_BOT_TOKEN"
    echo "  2. Install Python dependencies: pip install -r requirements.txt"
    echo "  3. Test Python tools: python tools/user_manager.py --help"
    echo "  4. Set up Node.js bot: cd bot && npm install"
else
    echo -e "${RED}✗ Database setup completed with warnings${NC}"
    echo -e "${YELLOW}  Please check the output above for errors${NC}"
    exit 1
fi
