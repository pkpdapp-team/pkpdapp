import json
import logging
from pathlib import Path

import tiktoken
from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
from docling_core.transforms.chunker.tokenizer.openai import OpenAITokenizer
from docling_core.types.doc import DoclingDocument

HERE = Path(__file__).parent
JSON_DIR = HERE / "docling"
CHUNKS_PATH = HERE / "chunks.jsonl"
TOKENIZER = "cl100k_base"  # the tokenizer of openai's embedding models
MAX_TOKENS = 1000

logger = logging.getLogger("chunk")


def make_chunker() -> HybridChunker:
    encoding = tiktoken.get_encoding(TOKENIZER)
    return HybridChunker(tokenizer=OpenAITokenizer(tokenizer=encoding, max_tokens=MAX_TOKENS))


def chunk_document(chunker: HybridChunker, doc: DoclingDocument) -> list[dict]:
    chunks = []
    for index, chunk in enumerate(chunker.chunk(dl_doc=doc)):
        pages = {prov.page_no for item in chunk.meta.doc_items for prov in item.prov}
        chunks.append({
            "filename": doc.origin.filename,
            "chunk_index": index,
            "pages": sorted(pages),
            "headings": chunk.meta.headings or [],
            "text": f"{doc.name}\n{chunker.contextualize(chunk=chunk)}",  # what gets embedded
            "raw_text": chunk.text,
        })
    return chunks


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s: %(message)s")
    chunker = make_chunker()
    total = 0
    with CHUNKS_PATH.open("w") as out:
        for json_path in sorted(JSON_DIR.glob("*.json")):
            chunks = chunk_document(chunker, DoclingDocument.load_from_json(json_path))
            for chunk in chunks:
                out.write(json.dumps(chunk) + "\n")
            total += len(chunks)
            logger.info(f"{len(chunks):4} chunks  {json_path.name}")
    logger.info(f"{total} chunks written to {CHUNKS_PATH}")


if __name__ == "__main__":
    main()
