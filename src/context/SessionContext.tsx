import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type {
  CompanyProfile,
  Message,
  Session,
  SessionAction,
  SessionState,
} from '../lib/types';

const initialState: SessionState = {
  session: null,
  messages: [],
  phase: 'configuring',
  isLoading: false,
  error: null,
};

function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_SESSION':
      return {
        ...state,
        session: action.payload,
        phase: action.payload.status,
        error: null,
      };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'SET_PHASE':
      return { ...state, phase: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'UPDATE_PROFILE':
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          company_profile: action.payload,
        },
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface SessionContextValue extends SessionState {
  setSession: (session: Session) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setPhase: (phase: SessionState['phase']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateProfile: (profile: CompanyProfile) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  const setSession = useCallback((session: Session) => {
    dispatch({ type: 'SET_SESSION', payload: session });
  }, []);

  const addMessage = useCallback((message: Message) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  }, []);

  const setMessages = useCallback((messages: Message[]) => {
    dispatch({ type: 'SET_MESSAGES', payload: messages });
  }, []);

  const setPhase = useCallback((phase: SessionState['phase']) => {
    dispatch({ type: 'SET_PHASE', payload: phase });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const updateProfile = useCallback((profile: CompanyProfile) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: profile });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setSession,
      addMessage,
      setMessages,
      setPhase,
      setLoading,
      setError,
      updateProfile,
      reset,
    }),
    [
      state,
      setSession,
      addMessage,
      setMessages,
      setPhase,
      setLoading,
      setError,
      updateProfile,
      reset,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return ctx;
}
