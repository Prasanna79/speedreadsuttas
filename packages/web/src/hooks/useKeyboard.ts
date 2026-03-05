import { useEffect } from 'react';

export interface KeyboardHandlers {
  togglePlay?: () => void;
  skipBackward?: () => void;
  skipForward?: () => void;
  increaseWpm?: () => void;
  decreaseWpm?: () => void;
  restart?: () => void;
  setChunkSize?: (size: number) => void;
  toggleTheme?: () => void;
  goHome?: () => void;
  exitFocusMode?: () => void;
}

function shouldIgnoreEvent(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function useKeyboard(handlers: KeyboardHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (shouldIgnoreEvent(event.target)) {
        return;
      }

      switch (event.key) {
        case ' ': {
          event.preventDefault();
          handlers.togglePlay?.();
          break;
        }
        case 'ArrowLeft': {
          handlers.skipBackward?.();
          break;
        }
        case 'ArrowRight': {
          handlers.skipForward?.();
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          handlers.increaseWpm?.();
          break;
        }
        case 'ArrowDown': {
          event.preventDefault();
          handlers.decreaseWpm?.();
          break;
        }
        case 'r': {
          handlers.restart?.();
          break;
        }
        case '1':
        case '2':
        case '3':
        case '4': {
          handlers.setChunkSize?.(Number(event.key));
          break;
        }
        case 'd': {
          handlers.toggleTheme?.();
          break;
        }
        case 'Escape': {
          if (handlers.exitFocusMode) {
            handlers.exitFocusMode();
            break;
          }
          handlers.goHome?.();
          break;
        }
        default:
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [handlers]);
}
