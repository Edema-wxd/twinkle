import localFont from 'next/font/local'
import { Montserrat } from 'next/font/google'

export const halimun = localFont({
  src: [
    {
      path: '../../public/fonts/Halimun.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-halimun',
  display: 'swap',
})

export const mistrully = localFont({
  src: [
    {
      path: '../../public/fonts/Mistrully.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-mistrully',
  display: 'swap',
})

export const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
})
