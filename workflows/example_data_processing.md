# Data Processing Workflow

## Objective
Process raw data files, clean and transform them, then export results to Google Sheets for analysis.

## Required Inputs
- **Input file path**: Path to the raw data file (CSV or JSON)
- **Sheet ID**: Google Sheets ID where results should be exported
- **Transformation rules**: Specific cleaning/transformation requirements

## Tools Used
- `tools/load_data.py` - Loads data from various file formats
- `tools/clean_data.py` - Applies cleaning and transformation rules
- `tools/export_to_sheets.py` - Exports processed data to Google Sheets

## Process

### 1. Load Raw Data
```bash
python tools/load_data.py --input <file_path> --output .tmp/raw_data.json
```
- Reads the input file
- Converts to standardized JSON format
- Saves to `.tmp/` directory

### 2. Clean and Transform
```bash
python tools/clean_data.py --input .tmp/raw_data.json --output .tmp/clean_data.json --rules <rules>
```
- Removes duplicates
- Handles missing values
- Applies transformation rules
- Validates data integrity

### 3. Export to Google Sheets
```bash
python tools/export_to_sheets.py --input .tmp/clean_data.json --sheet-id <sheet_id>
```
- Authenticates with Google API
- Creates or updates the target sheet
- Formats data appropriately
- Returns the sheet URL

## Expected Output
- Cleaned and transformed data in Google Sheets
- Direct URL to access the results
- Summary statistics in console

## Edge Cases

### Missing Required Columns
- **Issue**: Input data is missing expected columns
- **Solution**: Tool validates schema and reports missing fields; agent asks user for guidance

### Authentication Failure
- **Issue**: Google API credentials expired or invalid
- **Solution**: Tool reports auth error; agent checks credentials.json and token.json, guides user through re-authentication

### Rate Limits
- **Issue**: Google Sheets API rate limit exceeded
- **Solution**: Tool implements exponential backoff; for large datasets, splits into batches with delays

### Invalid Data Types
- **Issue**: Data types don't match expected format
- **Solution**: Cleaning tool attempts type coercion; reports rows that can't be converted

## Notes
- All intermediate files in `.tmp/` can be safely deleted after successful export
- Google Sheets URL is the primary deliverable
- Keep credentials.json and token.json in project root (gitignored)

## Improvements Log
- *2026-02-07*: Initial workflow created
