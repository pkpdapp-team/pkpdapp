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

`convert.py` is the slow step: it reads the PDFs once and keeps the result in
`docling/`. `make_chunks.py` is fast and rebuilds `chunks.jsonl` from all of
`docling/` on every run. `chunks.jsonl` has one chunk per line and is the file
the app loads into the document search (`manage.py documents ingest`).

## Adding a PDF

    python convert.py pdfs/new.pdf   # convert only the new PDF
    python make_chunks.py
    cd ../pkpdapp && python manage.py documents ingest ../documents/chunks.jsonl --pdfs ../documents/pdfs --add

With `--add`, only new and changed chunks are embedded into the live collection.

`--pdfs` is required: every file named in the chunks must be in that directory.
The PDFs are copied into `MEDIA_ROOT/documents/` and recorded as shared
`Document`s (re-ingesting replaces them), and the chatbot links its citations
to them. `documents delete` and `documents switch` leave the `Document`s alone.
