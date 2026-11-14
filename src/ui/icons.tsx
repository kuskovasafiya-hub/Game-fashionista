/**
 * Filled silhouette icons for the wardrobe tabs, drawn in currentColor on a 32x32 grid.
 * The same-colour stroke with round joins softens every corner.
 */
import type { JSX } from 'preact';

export type IconName = 'hair' | 'colour' | 'eye' | 'skin' | 'top' | 'bottom' | 'dress' | 'shoes' | 'ring';

const PATHS: Partial<Record<IconName, JSX.Element>> = {
  // long hair around a pale face, a side-swept fringe over the forehead
  hair: (
    <>
      <path opacity="0.35" stroke="none" d="M10.4 15.5c0 4.6 2.5 8 5.6 8s5.6-3.4 5.6-8-2.5-7-5.6-7-5.6 2.4-5.6 7z" />
      <path d="M16 3C9.8 3 6.5 7.6 6.5 13.6c0 5.6-.8 10-2.5 14.2 3 .8 5.8.6 8.4-.4-1.8-1.6-2.9-4.5-2.9-8.4l-.2-5.4C11.5 10.4 15.6 9 20 10.2c1.6.6 2.4 2.2 2.6 3.6l-.1 5.6c0 3.9-1.1 6.8-2.9 8.4 2.6 1 5.4 1.2 8.4.4-1.7-4.2-2.5-8.6-2.5-14.2C25.5 7.6 22.2 3 16 3z" />
    </>
  ),
  eye: (
    <>
      <path fill-rule="evenodd" d="M3 17.5c3.4-5 7.8-7.5 13-7.5s9.6 2.5 13 7.5c-3.4 5-7.8 7.5-13 7.5S6.4 22.5 3 17.5zM10.7 17.5a5.3 5.3 0 1 0 10.6 0a5.3 5.3 0 1 0-10.6 0zM13.6 17.5a2.4 2.4 0 1 0 4.8 0a2.4 2.4 0 1 0-4.8 0z" />
      <path fill="none" stroke-width="2.2" stroke-linecap="round" d="M9 11.3 7.2 8M16 9.8V5.8M23 11.3 24.8 8" />
    </>
  ),
  top: <path d="M11.5 5 4 9l3 6.5 3.2-1.6V27h11.6V13.9l3.2 1.6L28 9l-7.5-4c-.6 2.1-2.4 3.5-4.5 3.5S12.1 7.1 11.5 5z" />,
  bottom: <path d="M8 4h16l2.2 24h-6.6L16 13.5 12.4 28H5.8z" />,
  dress: <path d="M12 3h1.6L16 6.4 18.4 3H20l-.8 6.6L20.6 12l5.6 14.4C23 28.1 19.6 29 16 29s-7-.9-10.2-2.6L11.4 12l1.4-2.4z" />,
  // a pump on a thin heel, toe to the left
  shoes: <path d="M3.5 25.3c0-2.4 2-3.8 5.5-3.8 3 0 5.5-2 7.5-4.5l3-4c1-1.2 3-1.5 4.3-.5 2.7 2 4.2 4 4.7 7v8.8h-1.8l-.6-6.4c-4.4.6-8.6 2.2-12 4.6H5.6c-1.2 0-2.1-.5-2.1-1.2z" />,
  ring: (
    <>
      <path fill-rule="evenodd" d="M7.5 20.5a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0zM10.3 20.5a5.7 5.7 0 1 0 11.4 0a5.7 5.7 0 1 0-11.4 0z" />
      <path d="M12.4 7.6 14.2 4.5h3.6l1.8 3.1L16 12.6z" />
    </>
  ),
};

/** Icons in their own colours (not currentColor): a swatch of the choices. */
const SWATCHES: Partial<Record<IconName, JSX.Element>> = {
  // a wheel of the hair colours
  colour: (
    <g stroke="#fff" stroke-width="0.8">
      <path fill="#2b2430" d="M16 16L16 4A12 12 0 0 1 24.49 7.51z" />
      <path fill="#6a3c26" d="M16 16L24.49 7.51A12 12 0 0 1 28 16z" />
      <path fill="#c45a22" d="M16 16L28 16A12 12 0 0 1 24.49 24.49z" />
      <path fill="#c99050" d="M16 16L24.49 24.49A12 12 0 0 1 16 28z" />
      <path fill="#e4d9c6" d="M16 16L16 28A12 12 0 0 1 7.51 24.49z" />
      <path fill="#e27aab" d="M16 16L7.51 24.49A12 12 0 0 1 4 16z" />
      <path fill="#9b7ed4" d="M16 16L4 16A12 12 0 0 1 7.51 7.51z" />
      <path fill="#4f8ad0" d="M16 16L7.51 7.51A12 12 0 0 1 16 4z" />
    </g>
  ),
  // a drop of foundation in three skin tones
  skin: (
    <>
      <defs>
        <linearGradient id="icon-skin-tones" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0.36" stop-color="#f8cbaf" /><stop offset="0.36" stop-color="#e19565" />
          <stop offset="0.64" stop-color="#e19565" /><stop offset="0.64" stop-color="#794c34" />
        </linearGradient>
      </defs>
      <path fill="url(#icon-skin-tones)" stroke="none" d="M16 3c-4.8 6.2-9 11-9 16.2a9 9 0 0 0 18 0C25 14 20.8 9.2 16 3z" />
    </>
  ),
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg class={SWATCHES[name] ? 'icon-swatch' : undefined} viewBox="0 0 32 32" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" aria-hidden="true">
      {SWATCHES[name] ?? PATHS[name as keyof typeof PATHS]}
    </svg>
  );
}
