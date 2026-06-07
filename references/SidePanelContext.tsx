import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface SidePanelState {
    isOpen: boolean;
    title: string;
    content: ReactNode;
}

interface SidePanelContextValue {
    isOpen: boolean;
    title: string;
    content: ReactNode;
    openPanel: (title: string, content: ReactNode) => void;
    closePanel: () => void;
}

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

const INITIAL_STATE: SidePanelState = {
    isOpen: false,
    title: '',
    content: null,
};

export function SidePanelProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<SidePanelState>(INITIAL_STATE);

    const openPanel = useCallback((title: string, content: ReactNode) => {
        setState({ isOpen: true, title, content });
    }, []);

    const closePanel = useCallback(() => {
        setState(INITIAL_STATE);
    }, []);

    return (
        <SidePanelContext.Provider
            value={{
                isOpen: state.isOpen,
                title: state.title,
                content: state.content,
                openPanel,
                closePanel,
            }}
        >
            {children}
        </SidePanelContext.Provider>
    );
}

export function useSidePanel(): SidePanelContextValue {
    const context = useContext(SidePanelContext);

    if (!context) {
        throw new Error('useSidePanel must be used within a SidePanelProvider');
    }

    return context;
}
