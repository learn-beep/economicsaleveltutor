import site from '../data/site.json';

export const cropsOn = (import.meta.env.CROPS ?? process.env.CROPS ?? 'on') !== 'off';

export function waLink(context: string): string {
  const msg = "Hi, I'm looking for an Edexcel Economics Tutor. The student is in Year ..... Their name is ..................... we would like ........ lessons per week, the best two times for tutoring are ................. and ......................";
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(msg)}`;
}

export function pageTitle(t: string): string {
  return `${t} | Edexcel A-level Economics`;
}
