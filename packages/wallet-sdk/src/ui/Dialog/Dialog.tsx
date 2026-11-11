// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

import { clsx } from 'clsx';
import { FunctionComponent, JSX, render } from 'preact';

import { projectEthAccounts } from ':core/namespaces/eip155/session.js';
import { getDisplayableUsername } from ':core/username/getDisplayableUsername.js';
import { store } from ':store/store.js';
import { BaseLogo } from ':ui/assets/BaseLogo.js';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import css from './Dialog-css.js';

const closeIcon = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEzIDFMMSAxM20wLTEyTDEzIDEzIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+`;

// Helper function to detect phone portrait mode
function isPhonePortrait(): boolean {
  return window.innerWidth <= 600 && window.innerHeight > window.innerWidth;
}

// Handle bar component for mobile bottom sheet
const DialogHandleBar: FunctionComponent = () => {
  const [showHandleBar, setShowHandleBar] = useState(false);

  useEffect(() => {
    // Only show handle bar on phone portrait mode
    const checkOrientation = () => {
      setShowHandleBar(isPhonePortrait());
    };

    // Initial check
    checkOrientation();

    // Listen for orientation/resize changes
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!showHandleBar) {
    return null;
  }

  return <div class="-coinbase-wallet-sdk-dialog-handle-bar" />;
};

export type DialogProps = {
  title: string;
  message: string;
  actionItems?: DialogActionItem[];
  onClose?: () => void;
};

export type DialogInstanceProps = Omit<DialogProps, 'onClose'> & {
  handleClose: () => void;
};

export type DialogActionItem = {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
};

export class Dialog {
  private readonly items = new Map<number, DialogProps>();

  private nextItemKey = 0;
  private root: Element | null = null;

  constructor() {}

  public attach(el: Element): void {
    this.root = document.createElement('div');

    this.root.className = '-coinbase-wallet-sdk-dialog-root';
    el.appendChild(this.root);

    this.render();
  }

  public presentItem(itemProps: DialogProps): void {
    const key = this.nextItemKey++;
    this.items.set(key, itemProps);
    this.render();
  }

  public clear(): void {
    this.items.clear();
    if (this.root) {
      render(null, this.root);
    }
  }

  private render(): void {
    if (this.root) {
      render(
        <div>
          <DialogContainer>
            {Array.from(this.items.entries()).map(([key, itemProps]) => (
              <DialogInstance
                {...itemProps}
                key={key}
                handleClose={() => {
                  this.clear();
                  itemProps.onClose?.();
                }}
              />
            ))}
          </DialogContainer>
        </div>,
        this.root
      );
    }
  }
}

export const DialogContainer: FunctionComponent = (props) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  // Touch event handlers for drag-to-dismiss (entire dialog area)
  const handleTouchStart = (e: JSX.TargetedTouchEvent<HTMLDivElement>) => {
    // Only enable drag on mobile portrait mode
    if (!isPhonePortrait()) return;

    const touch = e.touches[0];
    setStartY(touch.clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: JSX.TargetedTouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;

    // Only allow dragging down (positive deltaY)
    if (deltaY > 0) {
      setDragY(deltaY);
      e.preventDefault(); // Prevent scrolling
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    // Dismiss if dragged down more than 100px
    if (dragY > 100) {
      // Find the dialog instance and trigger its close handler
      const closeButton = document.querySelector(
        '.-coinbase-wallet-sdk-dialog-instance-header-close'
      ) as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    } else {
      // Animate back to original position
      setDragY(0);
    }
  };

  return (
    <div class={clsx('-coinbase-wallet-sdk-dialog-container')}>
      <style>{css}</style>
      <div
        class="-coinbase-wallet-sdk-dialog-backdrop"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          class="-coinbase-wallet-sdk-dialog"
          style={{
            transform: `translateY(${dragY}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
        >
          <DialogHandleBar />
          {props.children}
        </div>
      </div>
    </div>
  );
};

export const DialogInstance: FunctionComponent<DialogInstanceProps> = ({
  title,
  message,
  actionItems,
  handleClose,
}) => {
  const [hidden, setHidden] = useState(true);
  const [isLoadingUsername, setIsLoadingUsername] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const instanceRef = useRef<HTMLDivElement>(null);
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;
  // Prefixed so the ids cannot collide with a host page's own Preact `useId` values.
  const id = `-coinbase-wallet-sdk-dialog-${useId()}`;
  const titleId = `${id}-title`;
  const messageId = `${id}-message`;

  // Modal focus: move focus into the dialog, keep Tab inside it, close on Escape, and hand
  // focus back to whatever the page had focused once the dialog goes away.
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initialFocus =
      instance.querySelector<HTMLElement>('.-coinbase-wallet-sdk-dialog-instance-button') ??
      instance.querySelector<HTMLElement>('button');
    initialFocus?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      // The header close button always renders, so there is at least one.
      const buttons = instance.querySelectorAll('button');
      const first = buttons[0];
      const last = buttons[buttons.length - 1];

      const active = document.activeElement;
      if (!instance.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHidden(false);
    }, 1);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const fetchEnsName = async () => {
      const session = store.session.get();
      const address = session ? projectEthAccounts(session)[0] : undefined;

      if (address) {
        const username = await getDisplayableUsername(address);
        setUsername(username);
      }

      setIsLoadingUsername(false);
    };
    fetchEnsName();
  }, []);

  const headerTitle = useMemo(() => {
    return username ? `Signed in as ${username}` : 'Coinbase Wallet';
  }, [username]);

  const shouldShowHeaderTitle = !isLoadingUsername;

  return (
    <div
      ref={instanceRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      class={clsx(
        '-coinbase-wallet-sdk-dialog-instance',
        hidden && '-coinbase-wallet-sdk-dialog-instance-hidden'
      )}
    >
      <div class="-coinbase-wallet-sdk-dialog-instance-header">
        <div class="-coinbase-wallet-sdk-dialog-instance-header-icon-and-title">
          <BaseLogo fill="blue" />
          {shouldShowHeaderTitle && (
            <div class="-coinbase-wallet-sdk-dialog-instance-header-icon-and-title-title">
              {headerTitle}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Close"
          class="-coinbase-wallet-sdk-dialog-instance-header-close"
          onClick={handleClose}
        >
          <img
            src={closeIcon}
            alt=""
            class="-coinbase-wallet-sdk-dialog-instance-header-close-icon"
          />
        </button>
      </div>
      <div class="-coinbase-wallet-sdk-dialog-instance-content">
        <div id={titleId} class="-coinbase-wallet-sdk-dialog-instance-content-title">
          {title}
        </div>
        <div id={messageId} class="-coinbase-wallet-sdk-dialog-instance-content-message">
          {message}
        </div>
      </div>
      {actionItems && actionItems.length > 0 && (
        <div class="-coinbase-wallet-sdk-dialog-instance-actions">
          {actionItems.map((action, i) => (
            <button
              type="button"
              class={clsx(
                '-coinbase-wallet-sdk-dialog-instance-button',
                action.variant === 'primary' &&
                  '-coinbase-wallet-sdk-dialog-instance-button-primary',
                action.variant === 'secondary' &&
                  '-coinbase-wallet-sdk-dialog-instance-button-secondary'
              )}
              onClick={action.onClick}
              key={i}
            >
              {action.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
