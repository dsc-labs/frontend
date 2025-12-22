// GSAP animation utilities
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// Fade in animation
export const fadeInGSAP = (element: string | Element, duration = 1) => {
  return gsap.fromTo(
    element,
    { opacity: 0 },
    { opacity: 1, duration, ease: 'power2.out' }
  )
}

// Slide in from left
export const slideInLeftGSAP = (element: string | Element, duration = 1) => {
  return gsap.fromTo(
    element,
    { x: -100, opacity: 0 },
    { x: 0, opacity: 1, duration, ease: 'power3.out' }
  )
}

// Slide in from right
export const slideInRightGSAP = (element: string | Element, duration = 1) => {
  return gsap.fromTo(
    element,
    { x: 100, opacity: 0 },
    { x: 0, opacity: 1, duration, ease: 'power3.out' }
  )
}

// Scale in animation
export const scaleInGSAP = (element: string | Element, duration = 1) => {
  return gsap.fromTo(
    element,
    { scale: 0.8, opacity: 0 },
    { scale: 1, opacity: 1, duration, ease: 'back.out(1.7)' }
  )
}

// Scroll-triggered animation
export const scrollAnimation = (
  element: string | Element,
  animation: gsap.TweenVars,
  triggerOptions?: ScrollTrigger.Vars
) => {
  return gsap.to(element, {
    ...animation,
    scrollTrigger: {
      trigger: element,
      start: 'top 80%',
      toggleActions: 'play none none reverse',
      ...triggerOptions
    }
  })
}

