#!/usr/bin/env python3
"""
Load testing tool for Wibecode RPG Bot API.

Sends concurrent requests to key API endpoints and reports
latency statistics (avg, p50, p95, p99), error rate, and throughput.

Usage:
    python tools/load_test.py                           # defaults: localhost:3000, 10 concurrent
    python tools/load_test.py --url https://yakutsa.ru  # test production
    python tools/load_test.py --concurrency 50 --rounds 5
"""

import argparse
import json
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError


# Endpoints to test (method, path, description)
ENDPOINTS = [
    ("GET", "/health", "Health check"),
    ("GET", "/api/metrics", "Prometheus metrics"),
]


def make_request(base_url: str, method: str, path: str) -> dict:
    """Send a single request and return timing info."""
    url = f"{base_url}{path}"
    req = Request(url, method=method)
    req.add_header("Accept", "application/json")

    start = time.perf_counter()
    try:
        resp = urlopen(req, timeout=30)
        elapsed = time.perf_counter() - start
        status = resp.status
        resp.read()  # consume body
        return {
            "path": path,
            "status": status,
            "latency": elapsed,
            "error": None,
        }
    except HTTPError as e:
        elapsed = time.perf_counter() - start
        return {
            "path": path,
            "status": e.code,
            "latency": elapsed,
            "error": f"HTTP {e.code}",
        }
    except (URLError, OSError) as e:
        elapsed = time.perf_counter() - start
        return {
            "path": path,
            "status": 0,
            "latency": elapsed,
            "error": str(e),
        }


def percentile(data: list[float], p: float) -> float:
    """Calculate the p-th percentile of a sorted list."""
    if not data:
        return 0.0
    k = (len(data) - 1) * (p / 100)
    f = int(k)
    c = f + 1
    if c >= len(data):
        return data[f]
    return data[f] + (k - f) * (data[c] - data[f])


def run_load_test(base_url: str, concurrency: int, rounds: int) -> None:
    """Execute the load test and print results."""
    print(f"\n{'='*60}")
    print(f"  Load Test — {base_url}")
    print(f"  Concurrency: {concurrency} | Rounds: {rounds}")
    print(f"  Total requests: {concurrency * rounds * len(ENDPOINTS)}")
    print(f"{'='*60}\n")

    all_results: dict[str, list[dict]] = {}
    for _, path, _ in ENDPOINTS:
        all_results[path] = []

    total_start = time.perf_counter()

    for round_num in range(1, rounds + 1):
        print(f"  Round {round_num}/{rounds}...", end=" ", flush=True)
        round_start = time.perf_counter()

        futures = []
        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            for method, path, _ in ENDPOINTS:
                for _ in range(concurrency):
                    futures.append(
                        executor.submit(make_request, base_url, method, path)
                    )

            for future in as_completed(futures):
                result = future.result()
                all_results[result["path"]].append(result)

        round_elapsed = time.perf_counter() - round_start
        print(f"done ({round_elapsed:.2f}s)")

    total_elapsed = time.perf_counter() - total_start

    # Print results per endpoint
    print(f"\n{'='*60}")
    print("  RESULTS")
    print(f"{'='*60}\n")

    total_requests = 0
    total_errors = 0

    for method, path, desc in ENDPOINTS:
        results = all_results[path]
        latencies = sorted([r["latency"] for r in results])
        errors = [r for r in results if r["error"] is not None]

        total_requests += len(results)
        total_errors += len(errors)

        avg_lat = statistics.mean(latencies) if latencies else 0
        p50 = percentile(latencies, 50)
        p95 = percentile(latencies, 95)
        p99 = percentile(latencies, 99)
        min_lat = min(latencies) if latencies else 0
        max_lat = max(latencies) if latencies else 0
        error_rate = (len(errors) / len(results) * 100) if results else 0

        print(f"  {method} {path} ({desc})")
        print(f"    Requests:   {len(results)}")
        print(f"    Errors:     {len(errors)} ({error_rate:.1f}%)")
        print(f"    Avg:        {avg_lat*1000:.1f}ms")
        print(f"    p50:        {p50*1000:.1f}ms")
        print(f"    p95:        {p95*1000:.1f}ms")
        print(f"    p99:        {p99*1000:.1f}ms")
        print(f"    Min/Max:    {min_lat*1000:.1f}ms / {max_lat*1000:.1f}ms")
        if errors:
            unique_errors = set(r["error"] for r in errors)
            print(f"    Error types: {', '.join(unique_errors)}")
        print()

    # Summary
    throughput = total_requests / total_elapsed if total_elapsed > 0 else 0
    overall_error_rate = (total_errors / total_requests * 100) if total_requests else 0

    print(f"  {'─'*40}")
    print(f"  SUMMARY")
    print(f"    Total time:     {total_elapsed:.2f}s")
    print(f"    Total requests: {total_requests}")
    print(f"    Total errors:   {total_errors} ({overall_error_rate:.1f}%)")
    print(f"    Throughput:     {throughput:.1f} req/s")
    print(f"  {'─'*40}\n")

    if overall_error_rate > 10:
        print("  !! HIGH ERROR RATE — check server logs")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Load test the Wibecode RPG API")
    parser.add_argument(
        "--url",
        default="http://localhost:3000",
        help="Base URL of the API (default: http://localhost:3000)",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=10,
        help="Number of concurrent requests per endpoint (default: 10)",
    )
    parser.add_argument(
        "--rounds",
        type=int,
        default=3,
        help="Number of rounds to run (default: 3)",
    )
    args = parser.parse_args()

    run_load_test(args.url, args.concurrency, args.rounds)


if __name__ == "__main__":
    main()
