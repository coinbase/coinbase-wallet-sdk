import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { BaseLogo } from './BaseLogo.js';

describe('BaseLogo', () => {
  it('renders an SVG element', () => {
    const { container } = render(<BaseLogo fill="blue" />);
    const svg = container.querySelector('svg');

    expect(svg).toBeInTheDocument();
    expect(svg?.tagName).toBe('svg');
  });

  it('has correct SVG attributes', () => {
    const { container } = render(<BaseLogo fill="blue" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
    expect(svg).toHaveAttribute('fill', 'none');
    expect(svg).toHaveAttribute('xmlns', 'http://www.w3.org/2000/svg');
  });

  it('contains a path element', () => {
    const { container } = render(<BaseLogo fill="blue" />);
    const path = container.querySelector('path');

    expect(path).toBeInTheDocument();
  });

  it('applies brand blue fill when fill is blue', () => {
    const { container } = render(<BaseLogo fill="blue" />);
    const path = container.querySelector('path');

    expect(path).toHaveAttribute('fill', '#0000FF');
  });

  it('applies white fill when fill is white', () => {
    const { container } = render(<BaseLogo fill="white" />);
    const path = container.querySelector('path');

    expect(path).toHaveAttribute('fill', '#FFF');
  });

  it('has correct path data', () => {
    const { container } = render(<BaseLogo fill="blue" />);
    const path = container.querySelector('path');

    const expectedPath =
      'M0 2.014C0 1.58105 0 1.36457 0.0815779 1.19805C0.159686 1.03861 0.288611 0.909686 0.448049 0.831578C0.61457 0.75 0.831047 0.75 1.264 0.75H14.736C15.169 0.75 15.3854 0.75 15.552 0.831578C15.7114 0.909686 15.8403 1.03861 15.9184 1.19805C16 1.36457 16 1.58105 16 2.014V15.486C16 15.919 16 16.1354 15.9184 16.302C15.8403 16.4614 15.7114 16.5903 15.552 16.6684C15.3854 16.75 15.169 16.75 14.736 16.75H1.264C0.831047 16.75 0.61457 16.75 0.448049 16.6684C0.288611 16.5903 0.159686 16.4614 0.0815779 16.302C0 16.1354 0 15.919 0 15.486V2.014Z';

    expect(path).toHaveAttribute('d', expectedPath);
  });

  it('renders consistently with same props', () => {
    const { container: container1 } = render(<BaseLogo fill="white" />);
    const { container: container2 } = render(<BaseLogo fill="white" />);

    const svg1 = container1.querySelector('svg');
    const svg2 = container2.querySelector('svg');
    const path1 = container1.querySelector('path');
    const path2 = container2.querySelector('path');

    expect(svg1?.outerHTML).toBe(svg2?.outerHTML);
    expect(path1?.getAttribute('fill')).toBe(path2?.getAttribute('fill'));
  });

  it('renders different colors for different fill values', () => {
    const { container: blueContainer } = render(<BaseLogo fill="blue" />);
    const { container: whiteContainer } = render(<BaseLogo fill="white" />);

    const bluePath = blueContainer.querySelector('path');
    const whitePath = whiteContainer.querySelector('path');

    expect(bluePath?.getAttribute('fill')).toBe('#0000FF');
    expect(whitePath?.getAttribute('fill')).toBe('#FFF');
    expect(bluePath?.getAttribute('fill')).not.toBe(whitePath?.getAttribute('fill'));
  });

  it('is accessible', () => {
    const { container } = render(<BaseLogo fill="blue" />);
    const svg = container.querySelector('svg');

    // SVG should have proper structure for accessibility
    expect(svg).toBeInTheDocument();
    expect(svg?.querySelector('path')).toBeInTheDocument();
  });

  it('maintains aspect ratio', () => {
    const { container } = render(<BaseLogo fill="blue" />);
    const svg = container.querySelector('svg');

    // 16:17 aspect ratio should be maintained through viewBox
    expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });
});
