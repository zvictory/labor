import localFont from 'next/font/local';

export const robotoSlab = localFont({
  src: '../../public/fonts/RobotoSlab-VariableFont.ttf',
  variable: '--font-roboto-slab',
  display: 'swap',
  weight: '100 900',
});

export const storyScript = localFont({
  src: '../../public/fonts/StoryScript-Regular.ttf',
  variable: '--font-story-script',
  display: 'swap',
  weight: '400',
});
