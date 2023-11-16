import { render } from '@testing-library/preact';
import { h } from 'preact';

import { Spinner } from './Spinner';

const renderSpinner = (props: { size?: number; color?: string }) => render(<Spinner {...props} />);

describe('Spinner', () => {
  test('renders default', () => {
    renderSpinner({});

    const svgStyle = document.querySelector('svg')?.style;
    const svgCircle = document.querySelector('circle')?.style;

    expect(svgStyle?.width).toEqual('64px');
    expect(svgStyle?.height).toEqual('64px');
    expect(svgCircle?.stroke).toEqual('#000');
  });

  test('renders overrides', () => {
    renderSpinner({
      size: 200,
      color: 'red',
    });

    const svgStyle = document.querySelector('svg')?.style;
    const svgCircle = document.querySelector('circle')?.style;

    expect(svgStyle?.width).toEqual('200px');
    expect(svgStyle?.height).toEqual('200px');
    expect(svgCircle?.stroke).toEqual('red');
  });
});
