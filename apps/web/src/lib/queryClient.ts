import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query'
import { useUIStore } from '../stores/uiStore'
const showError = (error: Error) => useUIStore.getState().addToast('error', error.message)
export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: showError }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (!mutation.options.onError) showError(error)
    },
  }),
  defaultOptions: { queries: { staleTime: 15000, retry: 1 } },
})
