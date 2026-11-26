import entries from '../assets/vanilla-artwork.json'

const urls = import.meta.glob<string>('../assets/vanilla-artwork/*.webp', { eager: true, import: 'default', query: '?url' })
export const vanillaArtwork = entries.map((entry) => ({ ...entry, url: urls['../assets/vanilla-artwork/' + entry.file] }))
const byKey = new Map(vanillaArtwork.flatMap((entry) => entry.keys.map((key) => [key.toLowerCase(), entry] as const)))
export const vanillaArtworkKeys = entries.flatMap((entry) => entry.keys).sort()

export function findVanillaArtwork(name: string) {
  const key = name.trim().split(/[\\/]/).pop()?.replace(/\.(png|jpe?g|webp)$/i, '').toLowerCase()
  return key ? byKey.get(key) : undefined
}
