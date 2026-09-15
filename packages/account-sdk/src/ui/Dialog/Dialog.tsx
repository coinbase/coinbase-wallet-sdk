// Copyright (c) 2018-2025 Coinbase, Inc. <https://www.coinbase.com/>

import { clsx } from 'clsx';
import { FunctionComponent, JSX, render } from 'preact';

import { projectEthAccounts } from ':core/namespaces/eip155/session.js';
import { getDisplayableUsername } from ':core/username/getDisplayableUsername.js';
import { store } from ':store/store.js';
import { BaseLogo } from ':ui/assets/BaseLogo.js';
import { useEffect, useMemo, useState } from 'preact/hooks';
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

  return <div class="-base-acc-sdk-dialog-handle-bar" />;
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

    this.root.className = '-base-acc-sdk-dialog-root';
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
        '.-base-acc-sdk-dialog-instance-header-close'
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
    <div class={clsx('-base-acc-sdk-dialog-container')}>
      <style>{css}</style>
      <div
        class="-base-acc-sdk-dialog-backdrop"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          class="-base-acc-sdk-dialog"
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
    return username ? `Signed in as ${username}` : 'Base Account';
  }, [username]);

  const shouldShowHeaderTitle = !isLoadingUsername;

  return (
    <div
      class={clsx(
        '-base-acc-sdk-dialog-instance',
        hidden && '-base-acc-sdk-dialog-instance-hidden'
      )}
    >
      <div class="-base-acc-sdk-dialog-instance-header">
        <div class="-base-acc-sdk-dialog-instance-header-icon-and-title">
          <BaseLogo fill="blue" />
          {shouldShowHeaderTitle && (
            <div class="-base-acc-sdk-dialog-instance-header-icon-and-title-title">
              {headerTitle}
            </div>
          )}
        </div>
        <div class="-base-acc-sdk-dialog-instance-header-close" onClick={handleClose}>
          <img src={closeIcon} class="-base-acc-sdk-dialog-instance-header-close-icon" />
        </div>
      </div>
      <div class="-base-acc-sdk-dialog-instance-content">
        <div class="-base-acc-sdk-dialog-instance-content-title">{title}</div>
        <div class="-base-acc-sdk-dialog-instance-content-message">{message}</div>
      </div>
      {actionItems && actionItems.length > 0 && (
        <div class="-base-acc-sdk-dialog-instance-actions">
          {actionItems.map((action, i) => (
            <button
              class={clsx(
                '-base-acc-sdk-dialog-instance-button',
                action.variant === 'primary' && '-base-acc-sdk-dialog-instance-button-primary',
                action.variant === 'secondary' && '-base-acc-sdk-dialog-instance-button-secondary'
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
