#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#

import cProfile
from contextlib import contextmanager
import io
import os
import pstats
import sys
import time


def _profiling_enabled():
    return os.environ.get("PKPDAPP_PROFILE_ENDPOINTS", "0").lower() not in {
        "0",
        "false",
        "no",
        "off",
    }


def _profile_limit():
    try:
        return int(os.environ.get("PKPDAPP_PROFILE_LIMIT", "50"))
    except ValueError:
        return 50


@contextmanager
def profile_endpoint(name, **metadata):
    if not _profiling_enabled():
        yield
        return

    profiler = cProfile.Profile()
    start = time.perf_counter()
    profiler.enable()
    try:
        yield
    finally:
        profiler.disable()
        elapsed = time.perf_counter() - start

        stream = io.StringIO()
        pstats.Stats(profiler, stream=stream).strip_dirs().sort_stats(
            "cumulative"
        ).print_stats(_profile_limit())

        metadata_string = " ".join(f"{key}={value}" for key, value in metadata.items())
        print(
            f"[profile] endpoint={name} elapsed_seconds={elapsed:.6f} "
            f"{metadata_string}\n{stream.getvalue()}",
            file=sys.stdout,
            flush=True,
        )
