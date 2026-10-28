/**
 * The track an external source is playing on the active player, matched to a
 * provider track so its lyrics can be looked up.
 *
 * A source such as Spotify Connect or AirPlay plays outside the Music Assistant
 * queue, so the player only reports what is on in its `current_media`: a title,
 * an artist and a position, with no media item to fetch lyrics for. This searches
 * the providers for that title and artist, and only takes a result that
 * `matchesExternalMedia` accepts, so a lookalike never puts the wrong song's
 * lyrics on screen.
 */

import { computed, ref, watch } from "vue";
import { resolveExternalSource } from "@/composables/externalSource";
import { matchesExternalMedia } from "@/helpers/external_source_track";
import api from "@/plugins/api";
import { MediaType, PlayerMedia, Track } from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";

// Enough results for the right recording to be among them when a title is shared
// by covers, remixes and live takes.
const SEARCH_LIMIT = 10;

// Results for the same song are reused, including "no match", so a track that
// plays twice is searched once.
const matchCache = new Map<string, Track | null>();

export function useExternalSourceTrack() {
  /** What the external source reports as playing, or undefined when the queue owns playback. */
  const externalMedia = computed((): PlayerMedia | undefined => {
    const player = store.activePlayer;
    if (!player || player.powered === false) return undefined;
    if (!resolveExternalSource(player, store.activePlayerQueue))
      return undefined;
    const media = player.current_media;
    return media?.title ? media : undefined;
  });

  const externalTrack = ref<Track>();

  const mediaKey = computed(() =>
    externalMedia.value
      ? `${externalMedia.value.artist ?? ""}\u0000${externalMedia.value.title}`
      : undefined,
  );

  watch(
    mediaKey,
    async (key) => {
      externalTrack.value = undefined;
      const media = externalMedia.value;
      if (!key || !media) return;

      if (!matchCache.has(key)) {
        try {
          const results = await api.search(
            `${media.artist ?? ""} ${media.title}`.trim(),
            [MediaType.TRACK],
            SEARCH_LIMIT,
          );
          matchCache.set(
            key,
            results.tracks.find((track) =>
              matchesExternalMedia(track, media),
            ) ?? null,
          );
        } catch (error) {
          // Not user-triggered: without a match the dashboard just shows no lyrics.
          console.error("Failed to match external source track:", error);
          return;
        }
      }
      // the song may have changed while the search was out
      if (key === mediaKey.value) {
        externalTrack.value = matchCache.get(key) ?? undefined;
      }
    },
    { immediate: true },
  );

  return { externalMedia, externalTrack };
}
