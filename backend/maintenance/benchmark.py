#!/usr/bin/env python3
"""
benchmark.py - API Performance Verification Tool

Measures latency of key API endpoints to verify < 800ms target.

Usage:
    python -m maintenance.benchmark --base-url http://localhost:8000 --iterations 20
"""

import argparse
import asyncio
import statistics
import time
from typing import List, Tuple

import httpx


# Endpoints to benchmark (method, path, requires_auth)
ENDPOINTS = [
    ("GET", "/api/v1/patients/", True),
    ("GET", "/api/v1/patients/?limit=10", True),
    ("GET", "/api/v1/auth/me", True),
]

# Target latency in milliseconds
TARGET_LATENCY_MS = 800


async def get_auth_token(client: httpx.AsyncClient, base_url: str) -> str:
    """Get auth token for protected endpoints."""
    # Try with test credentials
    try:
        response = await client.post(
            f"{base_url}/api/v1/auth/login",
            data={"username": "admin", "password": "admin123"},
        )
        if response.status_code == 200:
            return response.json().get("access_token", "")
    except Exception as e:
        print(f"Auth failed: {e}")
    return ""


async def benchmark_endpoint(
    client: httpx.AsyncClient,
    base_url: str,
    method: str,
    path: str,
    token: str,
    iterations: int,
) -> Tuple[str, List[float], int]:
    """
    Benchmark a single endpoint.
    
    Returns:
        (endpoint_name, latencies_ms, error_count)
    """
    latencies: List[float] = []
    errors = 0
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    for _ in range(iterations):
        start = time.perf_counter()
        try:
            if method == "GET":
                response = await client.get(f"{base_url}{path}", headers=headers)
            elif method == "POST":
                response = await client.post(f"{base_url}{path}", headers=headers, json={})
            else:
                continue
            
            elapsed_ms = (time.perf_counter() - start) * 1000
            
            if response.status_code < 400:
                latencies.append(elapsed_ms)
            else:
                errors += 1
                
        except Exception:
            errors += 1
    
    return f"{method} {path}", latencies, errors


def calculate_percentile(data: List[float], percentile: float) -> float:
    """Calculate percentile value."""
    if not data:
        return 0.0
    sorted_data = sorted(data)
    index = int(len(sorted_data) * percentile / 100)
    return sorted_data[min(index, len(sorted_data) - 1)]


async def main():
    parser = argparse.ArgumentParser(description="API Performance Benchmark")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Base URL of the API",
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=20,
        help="Number of iterations per endpoint",
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("UroLog API Performance Benchmark")
    print("=" * 60)
    print(f"Base URL: {args.base_url}")
    print(f"Iterations: {args.iterations}")
    print(f"Target Latency: < {TARGET_LATENCY_MS}ms")
    print()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Get auth token
        token = await get_auth_token(client, args.base_url)
        if not token:
            print("⚠️  Could not authenticate. Protected endpoints may fail.")
        else:
            print("✅ Authenticated successfully")
        print()
        
        # Benchmark each endpoint
        results = []
        for method, path, requires_auth in ENDPOINTS:
            endpoint_token = token if requires_auth else ""
            name, latencies, errors = await benchmark_endpoint(
                client, args.base_url, method, path, endpoint_token, args.iterations
            )
            results.append((name, latencies, errors))
        
        # Print results
        print("-" * 60)
        print(f"{'Endpoint':<35} {'Avg':>8} {'P95':>8} {'Max':>8} {'Status':>8}")
        print("-" * 60)
        
        all_passed = True
        for name, latencies, errors in results:
            if latencies:
                avg = statistics.mean(latencies)
                p95 = calculate_percentile(latencies, 95)
                max_lat = max(latencies)
                passed = p95 < TARGET_LATENCY_MS
                status = "✅ PASS" if passed else "❌ FAIL"
                if not passed:
                    all_passed = False
                print(f"{name:<35} {avg:>7.1f}ms {p95:>7.1f}ms {max_lat:>7.1f}ms {status:>8}")
            else:
                print(f"{name:<35} {'N/A':>8} {'N/A':>8} {'N/A':>8} {'❌ ERR':>8}")
                all_passed = False
        
        print("-" * 60)
        
        if all_passed:
            print("\n✅ BENCHMARK PASSED: All endpoints under target latency")
            return 0
        else:
            print("\n⚠️  BENCHMARK WARNING: Some endpoints exceeded target latency")
            return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
