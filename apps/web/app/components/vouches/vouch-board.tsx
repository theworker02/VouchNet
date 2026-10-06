'use client';

import { LayoutGroup } from 'framer-motion';
import { createPortal } from 'react-dom';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ComposerState, VouchPerson, WorkVouch } from '../../lib/work-vouches';
import { VouchConsole } from './vouch-console';
import { VouchInspector, type InspectorTarget } from './vouch-inspector';

export type BoardVouch = WorkVouch & { pending?: boolean };

export type BoardViewer = { userId: string; name: string; headline: string | null } | null;

type BoardValue = {
  recipient: VouchPerson;
  viewer: BoardViewer;
  composer: ComposerState | null;
  vouches: BoardVouch[];
  consoleOrigin: string | null;
  openConsole: (origin: string) => void;
  closeConsole: () => void;
  openInspector: (target: InspectorTarget) => void;
  addOptimistic: (vouch: BoardVouch) => void;
  settleOptimistic: (temporaryId: string, real: Partial<BoardVouch> | null) => void;
  replaceVouch: (vouch: BoardVouch) => void;
};

const BoardContext = createContext<BoardValue | null>(null);

export function useVouchBoard(): BoardValue {
  const value = useContext(BoardContext);
  if (value === null) throw new Error('useVouchBoard must be used inside VouchBoard');
  return value;
}

/**
 * Client state shared by the profile's Vouch button, trust module, console, and inspector so a
 * confirmed vouch appears immediately (optimistically) and rolls back if the server refuses it.
 */
export function VouchBoard({
  recipient,
  viewer,
  composer,
  initialVouches,
  children,
}: {
  recipient: VouchPerson;
  viewer: BoardViewer;
  composer: ComposerState | null;
  initialVouches: WorkVouch[];
  children: ReactNode;
}) {
  const [vouches, setVouches] = useState<BoardVouch[]>(initialVouches);
  const [consoleOrigin, setConsoleOrigin] = useState<string | null>(null);
  const [inspector, setInspector] = useState<InspectorTarget | null>(null);
  const [composerState, setComposerState] = useState(composer);

  const closeConsole = useCallback(() => setConsoleOrigin(null), []);
  const closeInspector = useCallback(() => setInspector(null), []);

  const value = useMemo<BoardValue>(
    () => ({
      recipient,
      viewer,
      composer: composerState,
      vouches,
      consoleOrigin,
      openConsole: (origin) => {
        setInspector(null);
        setConsoleOrigin(origin);
      },
      closeConsole,
      openInspector: (target) => setInspector(target),
      addOptimistic: (vouch) => setVouches((current) => [vouch, ...current]),
      settleOptimistic: (temporaryId, real) => {
        setVouches((current) =>
          real === null
            ? current.filter((vouch) => vouch.id !== temporaryId)
            : current.map((vouch) =>
                vouch.id === temporaryId ? { ...vouch, ...real, pending: false } : vouch,
              ),
        );
        if (real !== null)
          setComposerState((state) => {
            if (state === null) return state;
            const settled = vouches.find((vouch) => vouch.id === temporaryId);
            return settled === undefined
              ? state
              : { ...state, existing: { ...settled, ...real } as WorkVouch };
          });
      },
      replaceVouch: (vouch) => {
        setVouches((current) => current.map((item) => (item.id === vouch.id ? vouch : item)));
        setComposerState((state) =>
          state !== null && state.existing?.id === vouch.id ? { ...state, existing: vouch } : state,
        );
      },
    }),
    [closeConsole, composerState, consoleOrigin, recipient, viewer, vouches],
  );

  return (
    <BoardContext.Provider value={value}>
      <LayoutGroup id="vouch-board">
        {children}
        {consoleOrigin === null || composerState === null
          ? null
          : // Portaled to <body> so the fixed layer and its backdrop blur escape the page
            // transition's stacking context and cover the whole viewport, header included.
            createPortal(
              <VouchConsole origin={consoleOrigin} onClose={closeConsole} />,
              document.body,
            )}
      </LayoutGroup>
      {inspector === null
        ? null
        : createPortal(
            <VouchInspector target={inspector} onClose={closeInspector} />,
            document.body,
          )}
    </BoardContext.Provider>
  );
}
