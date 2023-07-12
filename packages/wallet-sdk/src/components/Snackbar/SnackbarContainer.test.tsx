import { fireEvent, render, screen } from '@testing-library/preact';
import { h } from 'preact';

import { SnackbarContainer, SnackbarInstance, SnackbarInstanceProps } from './Snackbar';

const renderSnackbarContainer = (props?: SnackbarInstanceProps) =>
  render(
    <SnackbarContainer darkMode>
      <SnackbarInstance {...props} />
    </SnackbarContainer>
  );

describe('SnackbarContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(window, 'setTimeout');
    renderSnackbarContainer({
      menuItems: [
        {
          isRed: true,
          info: 'Cancel transaction',
          svgWidth: '11',
          svgHeight: '11',
          path: '',
          defaultFillRule: 'inherit',
          defaultClipRule: 'inherit',
          onClick: jest.fn,
        },
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('render hidden', () => {
    const hiddenClass = document.getElementsByClassName('-cbwsdk-snackbar-instance-hidden');
    expect(hiddenClass.length).toEqual(1);
    jest.runAllTimers();
    expect(setTimeout).toHaveBeenCalledTimes(2);
  });

  test('toggle expand', () => {
    const header = document.getElementsByClassName('-cbwsdk-snackbar-instance-header')[0];
    const expandedClass = document.getElementsByClassName('-cbwsdk-snackbar-instance-expanded');
    fireEvent.click(header);
    expect(expandedClass.length).toEqual(1);
    expect(screen.queryByText('Cancel transaction')).toBeVisible();
  });
});
