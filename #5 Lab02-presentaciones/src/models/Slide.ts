export type SlideType = 'title' | 'content'

export type SlideLayout = 'text-only' | 'image-only' | 'text-and-image'

export interface Slide {
  id: string
  type: SlideType
  title: string
  body: string
  layout: SlideLayout
  imageUrl?: string
  author?: string
  topic?: string
  createdAt: string
  updatedAt: string
}
