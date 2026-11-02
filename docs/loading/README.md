# Application loading

The authenticated `_app` layout owns one `PageReadiness` session per committed
router location. All hydration fallbacks use the same loader. React Router waits
for route code and clientLoader data; the boundary then waits for the actual
rendered eager images (`load` plus `decode`) and the four Poppins weights used by
the UI. Nested hydration fallbacks are observed until their real content mounts.
Lazy images remain lazy. There is no global preload of unrelated pages or GLBs.

The page and its persistent canvas remain mounted under the loader. Three.js
reports its real downloading state; `SceneReady` lives inside the relevant model's
Suspense boundary and acknowledges the next frame after the model mounts. A second
image/font pass catches DOM content attached by Drei after model loading. Cached
camera/veil transitions keep playing without a redundant loading screen. PDF
readers register their first rendered page as an additional required resource.

The visible loader is only the animated sticker, without text or a card. Image/font
completion counters remain internal. On failure the still sticker is a keyboard-accessible
retry control, with its explanation available to screen readers. Thirty seconds without readiness produces a retry state; image/decode
failures, required 3D failures, and route errors do likewise. Retry reloads the
current URL, clearing rejected in-memory GLTF/module caches. Existing activity
drafts remain in sessionStorage. Previous sessions are aborted and cannot finish
or fail the destination's session. Fast navigation is debounced by 150 ms, while
first access has an immediate SSR poster that is embedded in the HTML.

The book illustration uses fun-isometric's original runtime, shape kit and motion
presets. `icons.ts` is the Bernalar drawing; palette: lavender and mint. Reduced
motion is handled live by the kit and holds frame 90. The contact sheet and peak
frames in this folder are review artifacts. The runtime and presets are copied
from Kelvin Adithya's MIT-licensed fun-isometric skill; see the skill's `SKILL.md`.

Validation should include: dashboard with slow data, fonts and image decoding;
failed images; cold and warm world/classroom models; repeated classroom entry;
PDF first-page loading; rapid navigation, cancellation and retry; reduced motion;
and portrait/landscape layout. Browser visual verification and real-device checks
must be reported separately from the unit tests when unavailable.
