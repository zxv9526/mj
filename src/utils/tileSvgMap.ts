// Mapping from standard Mahjong tile codes to user uploaded SVG files

export const TILE_CODE_TO_SVG_MAP: Record<string, string> = {
  // Wan (万子 Characters: 1m..9m) -> 08-characters-1.svg .. 16-characters-9.svg
  '1m': '08-characters-1.svg',
  '2m': '09-characters-2.svg',
  '3m': '10-characters-3.svg',
  '4m': '11-characters-4.svg',
  '5m': '12-characters-5.svg',
  '6m': '13-characters-6.svg',
  '7m': '14-characters-7.svg',
  '8m': '15-characters-8.svg',
  '9m': '16-characters-9.svg',

  // Tong (筒子 Circles: 1p..9p) -> 17-circles-1.svg .. 25-circles-9.svg
  '1p': '17-circles-1.svg',
  '2p': '18-circles-2.svg',
  '3p': '19-circles-3.svg',
  '4p': '20-circles-4.svg',
  '5p': '21-circles-5.svg',
  '6p': '22-circles-6.svg',
  '7p': '23-circles-7.svg',
  '8p': '24-circles-8.svg',
  '9p': '25-circles-9.svg',

  // Tiao (条子 Bamboos: 1s..9s) -> 26-bamboos-1.svg .. 34-bamboos-9.svg
  '1s': '26-bamboos-1.svg',
  '2s': '27-bamboos-2.svg',
  '3s': '28-bamboos-3.svg',
  '4s': '29-bamboos-4.svg',
  '5s': '30-bamboos-5.svg',
  '6s': '31-bamboos-6.svg',
  '7s': '32-bamboos-7.svg',
  '8s': '33-bamboos-8.svg',
  '9s': '34-bamboos-9.svg',

  // Honors (四风 Winds: 1z..4z) -> 04-east-wind.svg .. 07-north-wind.svg
  '1z': '04-east-wind.svg',
  '2z': '05-south-wind.svg',
  '3z': '06-west-wind.svg',
  '4z': '07-north-wind.svg',

  // Honors (三元 Dragons: 5z..7z) -> 03-red-dragon, 02-green-dragon, 01-white-dragon
  '5z': '03-red-dragon.svg',    // 红中 (Red Dragon)
  '6z': '02-green-dragon.svg',  // 发财 (Green Dragon)
  '7z': '01-white-dragon.svg',  // 白板 (White Dragon)

  // Back of tile
  'back': 'back.svg',
};

/**
 * Returns the public URL path for a given tile code
 */
export function getTileSvgUrl(code: string): string {
  const filename = TILE_CODE_TO_SVG_MAP[code];
  if (filename) {
    return `/static/tiles/${filename}`;
  }
  return `/static/tiles/${code}.svg`;
}
