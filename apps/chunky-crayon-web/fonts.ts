import localFont from 'next/font/local';

const rooneySans = localFont({
  src: [
    {
      path: './public/fonts/rooney-sans-black-italic.ttf',
      weight: '900',
      style: 'italic',
    },
    {
      path: './public/fonts/rooney-sans-black.ttf',
      weight: '900',
      style: 'normal',
    },
    {
      path: './public/fonts/rooney-sans-bold-italic.ttf',
      weight: '700',
      style: 'italic',
    },
    {
      path: './public/fonts/rooney-sans-bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './public/fonts/rooney-sans-heavy-italic.ttf',
      weight: '800',
      style: 'italic',
    },
    {
      path: './public/fonts/rooney-sans-heavy.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: './public/fonts/rooney-sans-light-italic.ttf',
      weight: '300',
      style: 'italic',
    },
    {
      path: './public/fonts/rooney-sans-light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './public/fonts/rooney-sans-medium-italic.ttf',
      weight: '500',
      style: 'italic',
    },
    {
      path: './public/fonts/rooney-sans-medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './public/fonts/rooney-sans-regular-italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: './public/fonts/rooney-sans-regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-rooney-sans',
});

const tondo = localFont({
  src: [
    {
      path: './public/fonts/tondo-bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './public/fonts/tondo-light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './public/fonts/tondo-regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-tondo',
});

export { rooneySans, tondo };
