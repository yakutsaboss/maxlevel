#!/usr/bin/env python3
"""
Example Tool - Template for WAT Framework Tools

This script demonstrates the structure and best practices for creating tools
in the WAT framework. Tools should be:
- Deterministic (same input = same output)
- Single-purpose (do one thing well)
- Well-documented (clear usage and error messages)
- Fail-fast (report errors immediately and clearly)
"""

import argparse
import json
import os
import sys
from typing import Dict, Any

from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Example tool that demonstrates WAT framework structure"
    )
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="Path to input file"
    )
    parser.add_argument(
        "--output",
        type=str,
        required=True,
        help="Path to output file"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose output"
    )
    return parser.parse_args()


def validate_inputs(input_path: str) -> None:
    """
    Validate that all required inputs are present and valid.

    Args:
        input_path: Path to the input file

    Raises:
        FileNotFoundError: If input file doesn't exist
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")


def process_data(input_path: str, verbose: bool = False) -> Dict[str, Any]:
    """
    Main processing logic.

    Args:
        input_path: Path to input file
        verbose: Whether to print verbose output

    Returns:
        Dictionary containing processed results
    """
    if verbose:
        print(f"Processing file: {input_path}")

    # Example processing logic
    result = {
        "status": "success",
        "input_file": input_path,
        "message": "This is an example output"
    }

    return result


def save_results(output_path: str, data: Dict[str, Any], verbose: bool = False) -> None:
    """
    Save results to output file.

    Args:
        output_path: Path where output should be saved
        data: Data to save
        verbose: Whether to print verbose output
    """
    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)

    if verbose:
        print(f"Results saved to: {output_path}")


def main():
    """Main execution function."""
    try:
        # Parse arguments
        args = parse_arguments()

        # Validate inputs
        validate_inputs(args.input)

        # Process data
        results = process_data(args.input, verbose=args.verbose)

        # Save results
        save_results(args.output, results, verbose=args.verbose)

        # Print success message
        print(f"✓ Processing complete. Output saved to {args.output}")

        return 0

    except Exception as e:
        print(f"✗ Error: {str(e)}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
