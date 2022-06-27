// Copyright (c) 2018-2022 Coinbase, Inc. <https://www.coinbase.com/>
// Licensed under the Apache License, version 2.0

import { h, render } from "preact";
import { BehaviorSubject, Observable, Subscription } from "rxjs";

import { TryExtensionLinkDialog } from "./TryExtensionLinkDialog";

export interface LinkFlowOptions {
  darkMode: boolean;
  version: string;
  sessionId: string;
  sessionSecret: string;
  linkAPIUrl: string;
  isParentConnection: boolean;
  connected$: Observable<boolean>;
}

interface Optional<T> {
  value?: T;
}

export class LinkFlow {
  private readonly darkMode: boolean;
  private readonly version: string;
  private readonly sessionId: string;
  private readonly sessionSecret: string;
  private readonly linkAPIUrl: string;
  private readonly isParentConnection: boolean;

  private readonly connected$: Observable<boolean>;
  private readonly extensionUI$: BehaviorSubject<Optional<boolean>> =
    new BehaviorSubject({});
  private readonly subscriptions = new Subscription();

  private isConnected = false;
  private isOpen = false;
  private onCancel: (() => void) | null = null;

  private root: Element | null = null;

  // if true, hide QR code in LinkFlow (which happens if no jsonRpcUrl is provided)
  private connectDisabled = false;

  constructor(options: Readonly<LinkFlowOptions>) {
    this.darkMode = options.darkMode;
    this.version = options.version;
    this.sessionId = options.sessionId;
    this.sessionSecret = options.sessionSecret;
    this.linkAPIUrl = options.linkAPIUrl;
    this.isParentConnection = options.isParentConnection;
    this.connected$ = options.connected$;
  }

  public attach(el: Element): void {
    this.root = document.createElement("div");
    this.root.className = "-cbwsdk-link-flow-root";
    el.appendChild(this.root);
    this.render();

    this.subscriptions.add(
      this.connected$.subscribe(v => {
        if (this.isConnected !== v) {
          this.isConnected = v;
          this.render();
        }
      }),
    );
  }

  public detach(): void {
    if (!this.root) {
      return;
    }
    this.subscriptions.unsubscribe();
    render(null, this.root);
    this.root.parentElement?.removeChild(this.root);
  }

  public setConnectDisabled(connectDisabled: boolean) {
    this.connectDisabled = connectDisabled;
  }

  public open(options: { onCancel: () => void }): void {
    this.isOpen = true;
    this.onCancel = options.onCancel;
    this.render();
  }

  public close(): void {
    this.isOpen = false;
    this.onCancel = null;
    this.render();
  }

  private render(): void {
    if (!this.root) {
      return;
    }

    const subscription = this.extensionUI$.subscribe(() => {
      if (!this.root) {
        return;
      }

      render(
        <TryExtensionLinkDialog
          darkMode={this.darkMode}
          version={this.version}
          sessionId={this.sessionId}
          sessionSecret={this.sessionSecret}
          linkAPIUrl={this.linkAPIUrl}
          isOpen={this.isOpen}
          isConnected={this.isConnected}
          isParentConnection={this.isParentConnection}
          onCancel={this.onCancel}
          connectDisabled={this.connectDisabled}
        />,
        this.root,
      );
    });

    this.subscriptions.add(subscription);
  }
}
