import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { UploadThingError } from 'uploadthing/server'
import { getAdminSession } from '@/lib/auth/server'

const f = createUploadthing()

export const ourFileRouter = {
  productImages: f({ image: { maxFileSize: '4MB', maxFileCount: 5 } })
    .middleware(async () => {
      const session = await getAdminSession()
      if (!session) throw new UploadThingError('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),

  contentImages: f({ image: { maxFileSize: '8MB', maxFileCount: 1 } })
    .middleware(async () => {
      const session = await getAdminSession()
      if (!session) throw new UploadThingError('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),

  // Ad landing page hero loops: short muted MP4s. The page asks for under 1.5 MB so it loads fast on 4G.
  landingVideos: f({ 'video/mp4': { maxFileSize: '2MB', maxFileCount: 1 } })
    .middleware(async () => {
      const session = await getAdminSession()
      if (!session) throw new UploadThingError('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),

  // Several images at once: Markdown imports and drag-and-drop into the blog editor
  blogImages: f({ image: { maxFileSize: '8MB', maxFileCount: 20 } })
    .middleware(async () => {
      const session = await getAdminSession()
      if (!session) throw new UploadThingError('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
