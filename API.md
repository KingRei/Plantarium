# StarGZR — Control API Reference

Machine-readable reference for every user-adjustable control. All controls are standard DOM elements; drive them programmatically by setting the value/checked property **and dispatching a `change` event** so internal state updates:

```js
// Checkbox pattern
const el = document.getElementById('tidalChk');
el.checked = true; el.dispatchEvent(new Event('change'));

// Select pattern
const s = document.getElementById('speed');
s.value = '86400000'; s.dispatchEvent(new Event('change'));

// Datetime pattern
const dt = document.getElementById('dt');
dt.value = '2026-08-12T17:40'; dt.dispatchEvent(new Event('change'));
```

Buttons are triggered with `.click()`. Keyboard flight uses real `keydown`/`keyup` events for keys `w a s d`.

## Header — time & place

| id | type | values / range | default | effect |
|---|---|---|---|---|
| `dt` | datetime-local | any local datetime (full accuracy 1700–2300) | now | sets simulation time |
| `nowBtn` | button | — | — | jump to current real time (label 切到現在 / Jump to now) |
| `playBtn` | button | toggles | paused | play/pause; label reflects state |
| `speed` | select | ms of sim-time per real second: `3600000` (1 h/s), `7200000` (2 h/s, default), `10800000` (3 h/s), `21600000` (6 h/s), `86400000` (1 d/s), `259200000` (3 d/s), `864000000` (10 d/s), `-86400000` (reverse 1 d/s) | `7200000` | playback rate |
| `lat` | number | −89.9 … 89.9 | 25.03 | observer latitude (°, N positive) |
| `lon` | number | −180 … 180 | 121.56 | observer longitude (°, E positive) |
| `retroTableBtn` | button | — | — | open yearly retrograde-interval modal (`yPrev`/`yNext` change year, `mClose` closes) |
| `langSel` | select | `zh`, `en` | `zh` | UI + all in-scene 3D label language |

Header also hosts `notifyBtn` (🔔/🔕 mute toasts; AI replies always show) and `micBtn` (🎙 voice AI: Groq ASR + GitHub Models LLM via a Cloudflare Worker + AI Gateway proxy (set `AI_PROXY_BASE` in the JS), falling back to locally-stored keys; actions restricted to a 28-id whitelist).

Easter egg: hover or long-press `#brandTitle` for 1.69 s to reveal the author tag.

## Left pane (heliocentric orrery) — panel toggled by clicking `#chipL`

| id | type | default | effect |
|---|---|---|---|
| `tidalChk` | checkbox | off | lunar tidal-force arrows + bulge diagram around Earth |
| `phaseChk` | checkbox | on | Moon phase hemisphere + Earth umbral cone + Moon shadow cone |
| `sphereChk` | checkbox | on | celestial sphere: constellations, ecliptic, precession circle, Polaris |
| `signChk` | checkbox | off | tropical zodiac sign sectors — colored bands on the orrery sphere **and** dashed cusp lines + sign labels along the ecliptic in the sky view |
| `orbitChk` | checkbox | on | planet orbit lines |
| `extraConstChk` | checkbox | off | extra famous constellations in the sky view: Ophiuchus, Summer Triangle, Centaurus, Orion, Ursa Major (Big Dipper), Cassiopeia, Crux, Cygnus, Canis Major, Boötes, Auriga |
| `scaleChk` | checkbox | off | **true-scale mode**: one linear scale (1 AU = 323 units) for sizes *and* distances; enables fly pad, observe controls, deep zoom (0.002–45 000); camera state is saved/restored per mode |
| `homeBtn` | button (true-scale only) | — | reset true-scale view to origin |
| `obsSel` | select (true-scale only) | `none` | follow-camera target: `none`, `sun`, `p0`…`p8` (Mercury…Pluto by ELEM index; `p2`=Earth), `moon`; jumps to 10× body radius and tracks the body; WASD flight cancels it |
| fly pad / keys | hold buttons or `W A S D` | — | true-scale free flight; forward/back/strafe relative to view; hold ≥1 s accelerates up to 7× |

## Right pane (horizon sky view) — panel toggled by clicking `#chipR`

| id | type | values | default | effect |
|---|---|---|---|---|
| `retroSel` | select | ELEM index as string: `0` Mercury, `1` Venus, `3` Mars, `4` Jupiter, `5` Saturn, `6` Uranus, `7` Neptune, `8` Pluto | `0` | which planet's retrograde trail is drawn; `#retroStatus` shows prograde/retrograde live |
| `trailChk` | checkbox | **off** | show the retrograde trail (solid past / dashed future / 30-day dots) |
| `trackSel` | select | `off`, `ecl_e`, `ecl_w`, `lun_e`, `lun_w` | `off` | **axis lock**: rolls camera so the ecliptic (`ecl_*`) or lunar orbit (`lun_*`) is a straight vertical line through screen center, aimed at its eastern (`_e`) or western (`_w`) horizon crossing; vertical drag slides the view along the axis |
| `lockSel` | select | `none`, `sun`, `moon`, `c:<zodiacKey>` (12 keys, e.g. `c:牡羊座` … `c:雙魚座`) | `none` | **target lock**: keeps the body/constellation centroid pinned at exact screen center; combinable with `trackSel` (target centered *and* chosen orbital plane kept vertical) |
| `constChk` | checkbox | on | constellation stick figures & names |
| `eclLineChk` | checkbox | off | ecliptic + lunar-orbit + celestial-equator lines and their labels |
| `bgStarChk` | checkbox | on | 500 random background stars |
| `dayChk` | checkbox | on | day/night sky-color cycle driven by solar altitude |
| `trailFxChk` | checkbox (row `#trailFxRow` visible only when \|speed\| ≥ 1 day/s) | off | **motion-trail rendering** (long-exposure star arcs). Turning it on force-sets and disables: `dayChk`=off, `eclLineChk`=off, `textChk`=off, `hideHorChk`=on (prevents text smearing); previous states are restored on turn-off. Off = anchored-sidereal-time smoothing only |
| `textChk` | checkbox | on | all text labels in the sky view |
| `hideHorChk` | checkbox | off | hide horizon, ground, alt-az grid, cardinal letters; below-horizon objects render at full brightness |
| `invChk` | checkbox | on | invert drag (grab-the-sky) |
| zoom | wheel / pinch | 0.1×–4.0× (tan focal ratio; `#zoomChip` displays) | 0.6× | field-of-view zoom |

### Behavioral notes for automation

- **Anchored sidereal time** (automatic, no control): while playing at \|speed\| ≥ 1 day/s with any `lockSel`/`trackSel` active, the sky's diurnal rotation is re-anchored to the locked body's right ascension so motion stays 60 fps smooth; true sidereal time resumes below the threshold.
- `lockSel` + `trackSel=lun_*` glues the Moon to the on-screen vertical line (lunar-orbit-plane roll); `lockSel=moon` + `ecl_*` shows its ±5.1° weave about the ecliptic instead.
- Observer body (`viewBodySel`: earth/moon/mars/titan) reshapes the sky view: planetocentric horizon frames, angular-size scaling (huge ringed Saturn from Titan, textured rotating Earth from the Moon), atmosphere-accurate sky colors (black lunar daytime, butterscotch Mars, orange Titan haze), observer's own body hidden, Moon hidden from Mars/Titan, lock menu adapts (Moon→Earth on the Moon; Saturn appears on Titan), lunar-axis options and the whole retrograde-trail row are Earth-only.
- Eclipse states (`#eclipseChip`, toasts, blood-moon tint, shadow-cone highlights, solar corona) are computed automatically from geometry; jump `dt` to e.g. `2026-08-12T17:40` (UTC) or `2025-09-07` to trigger.
- Lunar calendar (`#lunarRead`), Julian Day (`#jdReadout`), sim time (`#timeReadout`) update ~4×/s.
- Chinese calendar & full accuracy window: years 1700–2300.

## Readout element ids

`timeReadout`, `jdReadout`, `lunarRead`, `locReadout`, `zoomChip`, `retroStatus`, `eclipseChip`.
