import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const images = [
  ['doctor-hero', '1559839734-2b71ea197ec2'],
  ['medical-professional', '1612349317150-e413f6a5b16d'],
  ['healthcare-consultation', '1576091160399-112ba8d25d1d'],
  ['family-health', '1511895426328-dc8714191300'],
];
await mkdir('public/images', { recursive: true });
await Promise.all(images.map(async ([name, id]) => {
  const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=85`;
  const response = await fetch(url);
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Invalid image: ${name}`);
  const input = Buffer.from(await response.arrayBuffer());
  const info = await sharp(input).resize({ width: 1000, withoutEnlargement: true }).webp({ quality: 82 }).toFile(`public/images/${name}.webp`);
  console.log(name, response.status, response.headers.get('content-type'), info.width, info.height, info.size);
}));
