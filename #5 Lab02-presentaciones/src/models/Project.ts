import type { Slide } from './Slide'

export interface Project {
  id: string
  name: string
  author: string
  topic: string
  slides: Slide[]
  createdAt: string
  updatedAt: string
}
