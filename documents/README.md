# Documents for the chatbot's document search

Working folder for the document search data. Everything here except this README,
`.gitignore` and `pdfs/.gitkeep` is ignored by git, and the whole folder is
excluded from the Docker build.

| Folder | Contents |
| --- | --- |
| `pdfs/` | the source PDFs |
| `docling/` | one docling JSON per PDF, made by `documents chunk` |
| `chunks.jsonl` | the chunks of all documents, made by `documents chunk` |

How to make the chunks and load them is described in the
[Document Search section of the production installation guide](../docs/installation-prod.md#document-search).
