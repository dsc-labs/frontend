declare module 'vanilla-tilt' {
  export interface TiltOptions {
    max?: number
    speed?: number
    perspective?: number
    scale?: number
    glare?: boolean
    gyroscope?: boolean
    transition?: boolean
    reset?: boolean
    easing?: string
    [key: string]: unknown
  }

  interface VanillaTiltStatic {
    init(element: HTMLElement, options?: TiltOptions): void
  }

  const VanillaTilt: VanillaTiltStatic
  export default VanillaTilt
}
