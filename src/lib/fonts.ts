import localFont from 'next/font/local'
import { Raleway, Inter } from 'next/font/google'

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

export const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  display: 'swap',
})

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})
