import argparse
import json
import logging
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

from docling.datamodel.base_models import ConversionStatus, InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption

HERE = Path(__file__).parent
PDF_DIR = HERE / "pdfs"
JSON_DIR = HERE / "docling"
RUNS_DIR = HERE / "runs"

logger = logging.getLogger("convert")


def make_converter(formulas: bool) -> DocumentConverter:
    options = PdfPipelineOptions(
        do_ocr=False,  # reads only pdfs with a text layer
        do_formula_enrichment=formulas,
        queue_max_size=10,  # keeps big pdfs from filling the memory
    )
    return DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)}
    )


def convert(converter: DocumentConverter, pdf: Path, json_path: Path) -> dict:
    result = converter.convert(pdf)
    # write then rename, so a half-written file never counts as done
    tmp_path = json_path.with_suffix(".json.tmp")
    result.document.save_as_json(tmp_path)
    tmp_path.rename(json_path)

    pages = result.document.num_pages()
    if result.status == ConversionStatus.PARTIAL_SUCCESS:
        errors = "; ".join(error.error_message for error in result.errors)
        return {"status": "partial", "pages": pages, "error": errors}
    return {"status": "ok", "pages": pages}


def write_line(run_log, entry: dict):
    run_log.write(json.dumps(entry) + "\n")
    run_log.flush()  # keep the log complete if the process gets killed


def convert_or_skip(converter: DocumentConverter, pdf: Path, run_log) -> dict:
    json_path = JSON_DIR / f"{pdf.stem}.json"
    if json_path.exists():
        return {"status": "skipped"}

    write_line(run_log, {"file": pdf.name, "status": "started"})
    logger.info(f"started  {pdf.name}")
    start = time.perf_counter()
    try:
        entry = convert(converter, pdf, json_path)
    except Exception as error:
        entry = {"status": "failed", "error": repr(error)}
    entry["seconds"] = round(time.perf_counter() - start, 1)
    return entry


def main():
    parser = argparse.ArgumentParser(description="Convert PDFs to docling JSON.")
    parser.add_argument(
        "pdfs", nargs="*", type=Path, help="default: every PDF in pdfs/"
    )
    parser.add_argument(
        "--formulas", action="store_true", help="read formulas as LaTeX (slow)"
    )
    args = parser.parse_args()
    # show docling's progress messages, not only its warnings
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s: %(message)s")

    JSON_DIR.mkdir(exist_ok=True)
    RUNS_DIR.mkdir(exist_ok=True)
    log_path = RUNS_DIR / f"{datetime.now():%Y-%m-%d-%H%M%S}.jsonl"
    converter = make_converter(args.formulas)
    counts = Counter()
    failed = []
    run_start = time.perf_counter()

    with log_path.open("w") as run_log:
        for pdf in args.pdfs or sorted(PDF_DIR.glob("*.pdf")):
            entry = {
                "file": pdf.name,
                "formulas": args.formulas,
                **convert_or_skip(converter, pdf, run_log),
            }
            write_line(run_log, entry)
            counts[entry["status"]] += 1
            if entry["status"] == "failed":
                failed.append(pdf.name)
            seconds = entry.get("seconds", "")
            logger.info(f"{entry['status']:8} {seconds:>7} {pdf.name}")

        seconds = round(time.perf_counter() - run_start, 1)
        summary = {"summary": dict(counts), "failed": failed, "seconds": seconds}
        write_line(run_log, summary)

    logger.info(
        f"{dict(counts)} in {seconds} s, failed: {failed or 'none'}, log: {log_path}"
    )


if __name__ == "__main__":
    main()
