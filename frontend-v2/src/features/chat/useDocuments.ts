import {
  DocumentWrite,
  useDocumentsCreateMutation,
  useDocumentsDestroyMutation,
  useDocumentsListQuery,
  useDocumentsRetryCreateMutation,
} from "../../app/backendApi";

const POLL_INTERVAL_MS = 3000;

export function useDocuments(projectId: number | null) {
  const list = useDocumentsListQuery(
    { projectId: projectId! },
    { skip: !projectId },
  );
  const documents = list.data ?? [];
  const isProcessing = documents.some((d) => d.status === "processing");
  // Poll while an upload is being processed so its status updates.
  useDocumentsListQuery(
    { projectId: projectId! },
    { skip: !projectId || !isProcessing, pollingInterval: POLL_INTERVAL_MS },
  );
  const [createDocument, { isLoading: isUploading }] =
    useDocumentsCreateMutation();
  const [destroy] = useDocumentsDestroyMutation();
  const [retry] = useDocumentsRetryCreateMutation();

  // The API takes multipart/form-data; the generated type describes `file`
  // as a string, so build a FormData and cast.
  const upload = (file: File) => {
    const body = new FormData();
    body.append("file", file);
    body.append("project", String(projectId));
    return createDocument({ document: body as unknown as DocumentWrite });
  };

  return {
    documents,
    upload,
    isUploading,
    destroy: (id: number) => destroy({ id: String(id) }),
    retry: (id: number) => retry({ id: String(id) }),
    isLoading: list.isLoading,
  };
}
