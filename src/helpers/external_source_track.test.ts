import { describe, expect, it } from "vitest";
import { artist } from "../../tests/fixtures/artist";
import { track } from "../../tests/fixtures/track";
import {
  DURATION_TOLERANCE_S,
  matchesExternalMedia,
  normalizeTrackText,
} from "./external_source_track";

const media = (
  title: string | null,
  artistName: string | null = null,
  duration: number | null = null,
) => ({ title, artist: artistName, duration });

const song = (name: string, artists: string[], duration = 200) =>
  track({
    name,
    duration,
    artists: artists.map((n) => artist({ name: n })),
  });

describe("normalizeTrackText", () => {
  it("lower-cases and collapses punctuation", () => {
    expect(normalizeTrackText("Don't Stop  Me Now!")).toBe("don t stop me now");
  });

  it("drops bracketed suffixes", () => {
    expect(normalizeTrackText("Let It Be (Remastered 2009)")).toBe("let it be");
    expect(normalizeTrackText("Song [Explicit]")).toBe("song");
  });

  it("drops dashed suffixes", () => {
    expect(normalizeTrackText("Hey Jude - Live at Wembley")).toBe("hey jude");
  });

  it("keeps a hyphen inside a word", () => {
    expect(normalizeTrackText("Re-Run")).toBe("re run");
  });

  it("keeps letters outside ASCII", () => {
    expect(normalizeTrackText("Björk — Jóga")).toBe("björk jóga");
  });
});

describe("matchesExternalMedia", () => {
  it("matches on name and artist", () => {
    expect(
      matchesExternalMedia(
        song("Let It Be", ["The Beatles"]),
        media("Let It Be - Remastered 2009", "The Beatles"),
      ),
    ).toBe(true);
  });

  it("rejects a different name", () => {
    expect(
      matchesExternalMedia(
        song("Let It Go", ["The Beatles"]),
        media("Let It Be", "The Beatles"),
      ),
    ).toBe(false);
  });

  it("rejects a cover by another artist", () => {
    expect(
      matchesExternalMedia(
        song("Hallelujah", ["Jeff Buckley"]),
        media("Hallelujah", "Leonard Cohen"),
      ),
    ).toBe(false);
  });

  it("finds one artist in a combined artist string", () => {
    expect(
      matchesExternalMedia(
        song("Still Tippin'", ["Big Pokey"]),
        media("Still Tippin'", "Mike Jones, Slim Thug, Paul Wall, Big Pokey"),
      ),
    ).toBe(true);
  });

  it("only matches an artist on whole words", () => {
    expect(
      matchesExternalMedia(
        song("Song", ["Drake"]),
        media("Song", "Drakeo the Ruler"),
      ),
    ).toBe(false);
  });

  it("matches on name alone when no artist is reported", () => {
    expect(matchesExternalMedia(song("Song", ["Anyone"]), media("Song"))).toBe(
      true,
    );
  });

  it("never matches an empty title", () => {
    expect(matchesExternalMedia(song("", []), media(""))).toBe(false);
    expect(matchesExternalMedia(song("(Intro)", []), media(null))).toBe(false);
  });

  it("accepts lengths within the tolerance", () => {
    expect(
      matchesExternalMedia(
        song("Song", ["Artist"], 200),
        media("Song", "Artist", 200 + DURATION_TOLERANCE_S),
      ),
    ).toBe(true);
  });

  it("rejects lengths outside the tolerance", () => {
    expect(
      matchesExternalMedia(
        song("Song", ["Artist"], 200),
        media("Song", "Artist", 200 + DURATION_TOLERANCE_S + 1),
      ),
    ).toBe(false);
  });

  it("skips the length check when either length is unknown", () => {
    expect(
      matchesExternalMedia(
        song("Song", ["Artist"], 0),
        media("Song", "Artist", 300),
      ),
    ).toBe(true);
    expect(
      matchesExternalMedia(
        song("Song", ["Artist"], 200),
        media("Song", "Artist"),
      ),
    ).toBe(true);
  });
});
