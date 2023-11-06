import { h } from 'preact';

export function QRCodeIcon(props: h.JSX.SVGAttributes<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M3 3V8.99939L5 8.99996V5H9V3H3Z" />
      <path d="M15 21L21 21V15.0006L19 15V19L15 19V21Z" />
      <path d="M21 9H19V5H15.0006L15 3H21V9Z" />
      <path d="M3 15V21H8.99939L8.99996 19H5L5 15H3Z" />
    </svg>
  );
}
