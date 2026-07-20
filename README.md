# 觀星者 · StarGZR

An interactive, dual-view celestial simulator that runs entirely in the browser — no build step, no backend, no external assets beyond the three.js CDN.

![](favicon.svg)

## Views

**Left — Heliocentric orrery.** All nine classical planets (Pluto included) orbiting the Sun, computed from JPL-style Keplerian elements (J2000 epoch + secular rates). Shows Earth's 23.4° tilted rotation axis spinning at true sidereal rate with an observer marker at your configured latitude/longitude, the Moon with phase shading, Earth's umbral cone and the Moon's shadow cone, a lunar tidal-force diagram, the celestial sphere with the 12 zodiac constellations drawn from real star positions, the precession circle (the ~25,800-year path of Earth's axis among the stars), and the tropical zodiac sign sectors that drift against the constellations as the equinox precesses.

**Right — Horizon sky view.** A first-person view from any latitude/longitude on Earth: horizon, cardinal directions, alt-az grid, the ecliptic and the Moon's orbital path (白道, inclined 5.1°), real constellation stick figures, planets, the Sun, and a Moon rendered with its correct phase — bright limb always oriented toward the Sun. Retrograde loops are traced live (solid = past, dashed = future) with a prograde/retrograde status indicator.

## Features

- **Time travel** — pick any date/time (1700–2300 for full feature accuracy), play at 1 hr/s up to 10 days/s, or in reverse. Julian Day and the Chinese lunisolar date (農曆, computed astronomically with correct leap-month rules) are displayed live.
- **Retrograde table** — one click lists every planet's retrograde intervals for any year, refined to the day by bisection. Toast notifications fire when a planet stations during playback.
- **Eclipse detection** — geocentric geometry (Danjon umbra) flags total/partial lunar eclipses and solar eclipses in real time; the Moon turns blood-red, shadow cones highlight, and a corona ring appears around the Sun in the sky view.
- **Camera modes (sky view)** — free look (drag/pinch, invertible), lock onto the Sun, Moon, or any zodiac constellation, and/or engage *ecliptic-axis centering*, which rolls the camera so the ecliptic is a perfectly straight vertical line through screen center — all planets string along it. Zoom from 4.0× down to 0.1× ultra-wide.
- **True-scale mode (orrery)** — one honest linear scale (1 AU = 323 units) for *both* sizes and distances: the Sun is a 1.5-unit sphere, Earth is 0.014, the Moon sits 0.83 units (60.3 Earth radii) away, and shadow-cone lengths are geometrically exact. Sub-pixel bodies keep screen-size marker dots; zoom limits expand so you can dive to the Earth–Moon system or pull back past Pluto.
- **Precession everywhere** — star positions, Polaris, the pole marker, and the tropical sign belt all shift at 50.29″/yr. Scrub millennia to watch Vega become the pole star (~13,800 CE).
- Bilingual UI (繁體中文 / English) including all in-scene 3D labels; mobile-friendly (portrait stacks, landscape stays side-by-side, pinch zoom, collapsible panels).

## Files

| File | Purpose |
|---|---|
| `celestial-simulator.html` | Markup + embedded favicon; loads the other two files |
| `celestial-simulator.css` | All styles |
| `celestial-simulator.js` | Astronomy engine + both scenes (~65 KB, requires three.js r128, loaded from cdnjs) |

Deploy by dropping all three files in one directory (any static host). The optional AI voice assistant proxies through a Cloudflare Worker + AI Gateway — see the separate proxy package. Open `celestial-simulator.html` directly for local use.

## Accuracy & validation

The engine was verified against real-world anchors: GMST at J2000; equinox/solstice solar longitudes; Mars/Mercury/Venus/Saturn retrograde dates for 2025–26 (±1 day vs published ephemerides); all seven eclipses of 2025–26 detected (one total-vs-partial classification miss from the truncated lunar theory); Chinese calendar anchors including the 2020閏四月, 2023閏二月, and 2025閏六月 leap months; and precession behavior (Polaris closest approach ~2100, Vega near-pole ~13,800 CE).

Known limits: planetary longitudes ~0.1–0.5° over nearby centuries; lunar longitude ≲0.3° (eclipse timing ±~1 hr, borderline partial eclipses unreliable); constellation figures use J2000 star positions rotated rigidly for precession (no proper motion); Chinese calendar valid 1700–2300.

## License

MIT — do anything, attribution appreciated.
