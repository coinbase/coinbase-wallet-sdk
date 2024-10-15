import '@testing-library/jest-dom';

import { render, screen, waitFor } from '@testing-library/preact';
import { h } from 'preact';
import { vi } from 'vitest';

import { Snackbar } from './Snackbar.js';

const attachedEl = document.getElementsByClassName('-cbwsdk-snackbar-root');

describe('Snackbar', () => {
  const snackbar = new Snackbar();

  beforeEach(() => {
    render(<div id="attach-here" />);
    const ele = document.getElementById('attach-here');
    if (ele) {
      snackbar.attach(ele);
    }
  });

  describe('public methods', () => {
    test('@attach', () => {
      expect(attachedEl.length).toEqual(1);
    });

    test('@presentItem', async () => {
      snackbar.presentItem({
        message: 'Confirm on phone',
        menuItems: [
          {
            isRed: true,
            info: 'Cancel transaction',
            svgWidth: '11',
            svgHeight: '11',
            path: '',
            defaultFillRule: 'inherit',
            defaultClipRule: 'inherit',
            onClick: vi.fn,
          },
          {
            isRed: true,
            info: 'Reset connection',
            svgWidth: '10',
            svgHeight: '11',
            path: '',
            defaultFillRule: 'evenodd',
            defaultClipRule: 'evenodd',
            onClick: vi.fn,
          },
        ],
      });

      await waitFor(() => {
        expect(screen.queryByText('Cancel transaction')).toBeInTheDocument();
        expect(screen.queryByText('Reset connection')).toBeInTheDocument();
        expect(
          document.getElementsByClassName('-cbwsdk-snackbar-instance-menu-item-info-is-red').length
        ).toEqual(2);
      });
    });

    test('@clear', () => {
      const menuItems = document.getElementsByClassName('-cbwsdk-snackbar-instance-menu');
      expect(menuItems.length).toEqual(1);
      snackbar.clear();
      expect(menuItems.length).toEqual(0);
    });
  });
});
