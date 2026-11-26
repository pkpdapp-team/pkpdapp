#
# This file is part of PKPDApp (https://github.com/pkpdapp-team/pkpdapp) which
# is released under the BSD 3-clause license. See accompanying LICENSE.md for
# copyright notice and full license details.
#
"""Turn a PDF into the chunks the chatbot's document search embeds.

Used by the upload of project documents and by `manage.py documents chunk`, so
both make the same chunks. docling is imported inside the functions, because
it is slow to import.
"""
from pathlib import Path

TOKENIZER = "cl100k_base"  # the tokenizer of openai's embedding models
MAX_TOKENS = 1000


def make_converter(formulas: bool = False):
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption

    options = PdfPipelineOptions(
        do_ocr=False,  # reads only pdfs with a text layer
        do_formula_enrichment=formulas,
        queue_max_size=10,  # keeps big pdfs from filling the memory
    )
    return DocumentConverter(
        format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=options)}
    )


def convert_to_json(converter, pdf: Path, json_path: Path) -> dict:
    """Convert a PDF and save the docling document as JSON.

    Returns the outcome: {"status": "ok" or "partial", "pages": n, "error": ...}.
    """
    from docling.datamodel.base_models import ConversionStatus

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


def load_docling_json(json_path: Path):
    from docling_core.types.doc import DoclingDocument

    return DoclingDocument.load_from_json(json_path)


def make_chunker():
    import tiktoken
    from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
    from docling_core.transforms.chunker.tokenizer.openai import OpenAITokenizer

    encoding = tiktoken.get_encoding(TOKENIZER)
    tokenizer = OpenAITokenizer(tokenizer=encoding, max_tokens=MAX_TOKENS)
    return HybridChunker(tokenizer=tokenizer)


def chunk_document(chunker, doc, filename: str | None = None) -> list[dict]:
    """The chunks of a docling document.

    `filename` is what the chunks refer to the document by; by default the
    name docling recorded when it converted the file.
    """
    filename = filename or doc.origin.filename
    # what gets embedded starts with the document's name, without extension
    name = Path(filename).stem if filename else doc.name
    chunks = []
    for index, chunk in enumerate(chunker.chunk(dl_doc=doc)):
        pages = {prov.page_no for item in chunk.meta.doc_items for prov in item.prov}
        text = f"{name}\n{chunker.contextualize(chunk=chunk)}"
        chunks.append(
            {
                "filename": filename,
                "chunk_index": index,
                "pages": sorted(pages),
                "headings": chunk.meta.headings or [],
                "text": text,
                "raw_text": chunk.text,
            }
        )
    return chunks


def chunk_pdf(path: Path, filename: str) -> list[dict]:
    """Convert and chunk a PDF. Slow: reads every page.

    `filename` is what the chunks refer to the PDF by, which can differ from
    the name of the file on disk.
    """
    result = make_converter().convert(path)
    return chunk_document(make_chunker(), result.document, filename=filename)
