/**
 * Текстуры Spine-моделей из `isHarryh/Ark-Models` лежат с premultiplied alpha.
 * Canvas 2D считает PNG straight-alpha и домножает RGB на альфу ещё раз —
 * на полупрозрачных краях (и на швах треугольников меша) это давало серые
 * полоски. Раз-домножаем один раз при загрузке: RGB = RGB * 255 / A.
 *
 * Функция возвращает canvas, который можно передать в `spine.canvas.CanvasTexture`.
 */
export function unpremultiplyTexture(image: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a > 0 && a < 255) {
      const k = 255 / a;
      px[i] = Math.min(255, px[i] * k);
      px[i + 1] = Math.min(255, px[i + 1] * k);
      px[i + 2] = Math.min(255, px[i + 2] * k);
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}
