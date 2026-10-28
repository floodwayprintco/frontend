/**
 * Matching what an external source reports as playing (Spotify Connect, AirPlay,
 * ...) to a provider track, so its lyrics can be looked up without ever showing
 * the wrong song's.
 */

import type { PlayerMedia, Track } from "@/plugins/api/interfaces";

// Lengths further apart than this are a different recording (a live take, an
// extended mix), whose lyrics would drift out of sync.
export const DURATION_TOLERANCE_S = 5;

/** Lower-cased, with bracketed and dashed suffixes such as "(Remastered 2011)" or " - Live" dropped. */
export function normalizeTrackText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s*[([].*?[)\]]/g, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Whether a provider track is the song the external source is playing: the name
 * must agree, one of the track's artists must be in the reported artist, and the
 * lengths must agree when both are known.
 */
export function matchesExternalMedia(
  track: Track,
  media: Pick<PlayerMedia, "title" | "artist" | "duration">,
): boolean {
  const title = normalizeTrackText(media.title ?? "");
  if (!title || normalizeTrackText(track.name) !== title) return false;
  // current_media carries the artists as one string, e.g. "Paul Wall, Big Pokey"
  // Padded so a name only matches whole words: "Drake" is not in "Drakeo the Ruler".
  const artist = normalizeTrackText(media.artist ?? "");
  if (
    artist &&
    !track.artists.some((a) => {
      const name = normalizeTrackText(a.name);
      return !!name && ` ${artist} `.includes(` ${name} `);
    })
  ) {
    return false;
  }
  if (media.duration && track.duration) {
    return Math.abs(media.duration - track.duration) <= DURATION_TOLERANCE_S;
  }
  return true;
}
