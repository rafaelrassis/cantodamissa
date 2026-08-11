/** Pequenas conversões de cor — só o necessário pra derivar um tom claro
 * (--accent-soft) e uma cor de texto com contraste ok (--accent-fg) a
 * partir da cor de destaque escolhida livremente pelo usuário. */

function hexParaRgb(hex: string): [number, number, number] {
  const limpo = hex.replace('#', '');
  const num = parseInt(limpo.length === 3 ? limpo.replace(/(.)/g, '$1$1') : limpo, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbParaHex(r: number, g: number, b: number): string {
  const canal = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${canal(r)}${canal(g)}${canal(b)}`;
}

function rgbParaHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s * 100, l * 100];
}

function hslParaRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Versão bem clara da cor — usada pro fundo "soft" (chips, hovers). */
export function tomClaro(hex: string): string {
  const [r, g, b] = hexParaRgb(hex);
  const [h, s] = rgbParaHsl(r, g, b);
  const [r2, g2, b2] = hslParaRgb(h, Math.min(s, 60), 93);
  return rgbParaHex(r2, g2, b2);
}

/** Branco ou um texto escuro, o que der mais contraste sobre a cor dada. */
export function corDeContraste(hex: string): string {
  const [r, g, b] = hexParaRgb(hex);
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? '#0f1c13' : '#ffffff';
}
