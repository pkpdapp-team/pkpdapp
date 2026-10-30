# Documents for the chatbot's document search

Working folder for the document search (RAG) data and the scripts that prepare
it. Everything here except this README, `.gitignore`, the Python scripts and
`requirements.txt` is ignored by git, and the whole folder is excluded from the
Docker build.

| Folder | Contents |
| --- | --- |
| `pdfs/` | the source PDFs |
| `docling/` | one docling JSON per PDF, made by `convert.py` |
| `runs/` | one run log per `convert.py` run |
| `chunks.jsonl` | the chunks of all documents, made by `make_chunks.py` |

## Setup

    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt

## Usage

    python convert.py      # pdfs/ → docling/ (options: --help)
    python make_chunks.py  # docling/ → chunks.jsonl
