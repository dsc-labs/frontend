# Hướng dẫn Animation SVG Line Drawing

## Tổng quan

Component `AnimatedSVG` được tạo để thực hiện hiệu ứng vẽ đường nét SVG (SVG Line Drawing) giống như kiến trúc sư đang vẽ trực tiếp lên màn hình. Sau khi các đường nét hoàn tất, các chú thích (annotations) sẽ xuất hiện.

## Cấu trúc Component

### AnimatedSVG Component
- **Location**: `src/components/common/AnimatedSVG/AnimatedSVG.tsx`
- **CSS**: `src/components/common/AnimatedSVG/AnimatedSVG.css`
- **Utilities**: `src/utils/svgLineDrawing.ts`

## Cách sử dụng

### 1. Với Paths Array (Khuyến nghị)

```tsx
import AnimatedSVG from '../../components/common/AnimatedSVG/AnimatedSVG'

const paths = [
  'M 100 100 L 200 150 L 300 200',
  'M 200 200 Q 300 250 400 300',
  // ... thêm các paths khác
]

const annotations = [
  { id: 'hydraulic', text: 'Hydraulic System', x: 200, y: 150, anchor: 'start' },
  { id: 'logic', text: 'Logic Board', x: 500, y: 300, anchor: 'middle' },
]

<AnimatedSVG
  paths={paths}
  annotations={annotations}
  duration={3}
  delay={0.5}
  strokeColor="#000000"
  strokeWidth={2}
  onComplete={() => console.log('Animation complete!')}
/>
```

### 2. Với SVG Content String

```tsx
const svgContent = `
  <svg viewBox="0 0 800 600">
    <path d="M 100 100 L 200 150" />
    <path d="M 200 200 Q 300 250 400 300" />
  </svg>
`

<AnimatedSVG
  svgContent={svgContent}
  annotations={annotations}
  duration={3}
/>
```

### 3. Với SVG URL

```tsx
<AnimatedSVG
  svgUrl="/robot.svg"
  paths={paths} // Cần cung cấp paths riêng
  annotations={annotations}
  duration={3}
/>
```

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `svgContent` | `string` | - | Nội dung SVG dạng string |
| `svgUrl` | `string` | - | URL đến file SVG |
| `paths` | `string[]` | `[]` | Mảng các path data strings |
| `annotations` | `Annotation[]` | `[]` | Mảng các chú thích |
| `duration` | `number` | `2` | Thời gian animation (giây) |
| `delay` | `number` | `0` | Độ trễ trước khi bắt đầu (giây) |
| `strokeColor` | `string` | `"#000000"` | Màu của đường nét |
| `strokeWidth` | `number` | `2` | Độ dày đường nét |
| `onComplete` | `() => void` | - | Callback khi animation hoàn tất |

## Annotation Interface

```typescript
interface Annotation {
  id: string           // Unique ID
  text: string         // Text hiển thị
  x: number           // Tọa độ X
  y: number           // Tọa độ Y
  anchor?: 'start' | 'middle' | 'end'  // Căn chỉnh text
}
```

## Chuyển đổi SVG Image thành Paths

File `robot.svg` hiện tại là một ảnh base64, không phải SVG vector. Để sử dụng animation, bạn cần:

### Cách 1: Sử dụng Inkscape (Miễn phí)

1. Mở Inkscape
2. Import file `robot.svg`
3. Chọn **Path > Trace Bitmap** (nếu là ảnh raster)
   - Hoặc nếu đã là vector, chọn **Path > Object to Path**
4. Export paths:
   - Chọn từng path
   - Copy path data từ XML Editor (Edit > XML Editor)
   - Hoặc export thành SVG và extract paths

### Cách 2: Sử dụng Adobe Illustrator

1. Mở file trong Illustrator
2. Chọn **Object > Image Trace > Make**
3. Chọn **Object > Expand**
4. Export thành SVG
5. Extract path data từ SVG code

### Cách 3: Sử dụng Online Tools

- **AutoTrace**: https://autotrace.sourceforge.net/
- **Vectorizer.io**: https://vectorizer.io/
- **SVG Path Editor**: https://yqnn.github.io/svg-path-editor/

### Cách 4: Manual Extraction

1. Mở SVG file trong text editor
2. Tìm các thẻ `<path d="...">`
3. Copy giá trị của attribute `d`
4. Thêm vào mảng `paths`

## Ví dụ Path Data

```typescript
const robotHandPaths = [
  // Outline của bàn tay
  'M 100 200 L 150 180 L 200 200 L 250 220 L 200 240 L 150 220 Z',
  
  // Ngón tay 1
  'M 150 180 L 160 120 L 170 100 L 160 80',
  
  // Ngón tay 2
  'M 200 200 L 210 140 L 220 120 L 210 100',
  
  // Ngón tay 3
  'M 250 220 L 260 160 L 270 140 L 260 120',
  
  // Các đường kỹ thuật
  'M 120 250 L 120 300 L 280 300 L 280 250',
  'M 200 200 L 200 300',
  
  // ... thêm các paths khác
]
```

## Tùy chỉnh Animation

### Thay đổi tốc độ vẽ

```tsx
<AnimatedSVG
  paths={paths}
  duration={5}  // Vẽ chậm hơn (5 giây)
  // hoặc
  duration={1}   // Vẽ nhanh hơn (1 giây)
/>
```

### Thay đổi màu và độ dày

```tsx
<AnimatedSVG
  paths={paths}
  strokeColor="#FF0000"  // Màu đỏ
  strokeWidth={3}         // Đường dày hơn
/>
```

### Stagger delay giữa các paths

Component tự động thêm delay 0.1s giữa mỗi path. Để tùy chỉnh, bạn có thể chỉnh sửa trong `AnimatedSVG.tsx`:

```typescript
timeline.to(
  path,
  {
    strokeDashoffset: 0,
    duration: pathDuration,
    ease: 'none',
  },
  index * 0.2  // Tăng delay giữa các paths
)
```

## Troubleshooting

### Paths không hiển thị
- Kiểm tra path data có hợp lệ không
- Đảm bảo viewBox phù hợp với tọa độ paths
- Kiểm tra console có lỗi không

### Animation không chạy
- Đảm bảo GSAP đã được import
- Kiểm tra ref có được gán đúng không
- Thử tăng delay để đảm bảo component đã mount

### Annotations không xuất hiện
- Kiểm tra IDs có khớp không
- Đảm bảo tọa độ x, y nằm trong viewBox
- Kiểm tra opacity ban đầu được set về 0

## Best Practices

1. **Tối ưu số lượng paths**: Quá nhiều paths có thể làm animation lag
2. **Sắp xếp thứ tự paths**: Vẽ từ ngoài vào trong, từ background đến foreground
3. **Điều chỉnh duration**: Paths dài cần thời gian lâu hơn
4. **Test trên nhiều trình duyệt**: Đảm bảo animation mượt trên tất cả browsers

## Next Steps

1. Convert file `robot.svg` thành paths
2. Xác định vị trí annotations trên bản vẽ
3. Tùy chỉnh màu sắc và timing
4. Test animation trên các thiết bị khác nhau

