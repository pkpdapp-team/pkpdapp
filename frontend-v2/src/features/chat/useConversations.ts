import {
  useConversationsListQuery,
  useConversationsCreateMutation,
  useConversationsDestroyMutation,
  useMessagesListQuery,
} from "../../app/backendApi";

export function useConversations(projectId: number | null) {
  const list = useConversationsListQuery(
    { projectId: projectId! },
    { skip: !projectId },
  );
  const [create] = useConversationsCreateMutation();
  const [destroy] = useConversationsDestroyMutation();
  return {
    conversations: list.data ?? [],
    create,
    destroy,
    isLoading: list.isLoading,
    refetch: list.refetch,
  };
}

export function useConversationMessages(conversationId: number | null) {
  return useMessagesListQuery(
    { conversationId: conversationId! },
    { skip: !conversationId },
  );
}
