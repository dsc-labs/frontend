# MMA Robot Landing Page

Dự án landing page được xây dựng với React + TypeScript + Vite, tối ưu cho animation nặng.

## Công nghệ sử dụng

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool nhanh
- **Framer Motion** - Animation library cho React
- **GSAP** - Animation library mạnh mẽ cho animation phức tạp
- **Lottie React** - Hỗ trợ animation Lottie
- **React Router DOM** - Routing cho SPA

## Cài đặt

```bash
npm install
```

## Chạy dự án

```bash
npm run dev
```

Dự án sẽ chạy tại `http://localhost:3000`

## Build

```bash
npm run build
```

## Cấu trúc thư mục

```
src/
  ├── components/     # Các component React
  │   ├── Navigation.tsx
  │   ├── Logo.tsx
  │   ├── HeroSection.tsx
  │   ├── VideoCard.tsx
  │   └── SocialIcons.tsx
  ├── pages/          # Các trang của website
  │   ├── Home.tsx           # Trang chủ
  │   ├── About.tsx          # ABOUT / WHAT WE DO
  │   ├── DataPlatform.tsx   # DECENTRALIZED DATA PLATFORM
  │   ├── UseCases.tsx       # USE CASES
  │   ├── TechnologyStack.tsx # TECHNOLOGY STACK
  │   └── Partners.tsx       # OUR PARTNERS
  ├── animations/     # Các animation utilities
  ├── styles/         # CSS/SCSS files
  ├── assets/         # Images, videos, etc.
  ├── App.tsx         # Component chính với routing
  ├── main.tsx        # Entry point
  └── index.css       # Global styles
```

## Routing

Dự án sử dụng React Router với 6 trang:

- `/` - Home (Trang chủ)
- `/about` - ABOUT / WHAT WE DO
- `/data-platform` - DECENTRALIZED DATA PLATFORM
- `/use-cases` - USE CASES
- `/technology-stack` - TECHNOLOGY STACK
- `/partners` - OUR PARTNERS

## Animation Libraries

### Framer Motion
Sử dụng cho các animation React components:
```tsx
import { motion } from 'framer-motion'
```

### GSAP
Sử dụng cho các animation phức tạp và timeline:
```tsx
import { gsap } from 'gsap'
```

### Lottie
Sử dụng cho các animation JSON:
```tsx
import Lottie from 'lottie-react'
```

