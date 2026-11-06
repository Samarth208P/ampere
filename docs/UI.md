# AMPERE interface

## Source of visual truth

`DESIGN.md` is the user's Auros style reference, copied byte-for-byte from their attachment. Keep it unchanged. Implementation notes belong here, rather than rewriting that supplied reference.

The interface uses its Liquid Abyss (`#012624`), Liquid Deep (`#011d1c`), and Liquid Kelp (`#003734`) surface stack, white medium-weight headings, silver body text, pale pink statistics, and cyan-to-pink primary actions. Panels use 16px corners; controls use 6px. The explicit shape rules take precedence over the conflicting illustrative pill-button prompt in the reference. There are no elevation shadows.

DM Sans is the reference's expressly permitted substitute for Matter. Only its 400 and 500 weights are loaded locally. Monospace is reserved for request methods, measurements, commands, and identifiers.

## Routes and behavior

- `/` opens the working recorder directly, in Live mode. It preserves the Recorder, Nodes, and Reports views, source selection, filtering, request inspection, signed exports, and verification.
- The header's **How it works** link opens `/how-it-works`. This optional project explanation covers the collection workflow, measurement boundaries, and signed reports. Its app links and AMPERE logo return to `/`.
- Request details open after selecting a request or timeline bar. Keyboard focus moves to the details; closing restores focus to the selecting control. Narrow layouts scroll details into view.
- Baseline comparison uses native expandable disclosure. Its collapsed summary retains the elevated-method count.
- Loading, empty, filtered-empty, and failed-fetch states remain distinct. Filtered empty states offer **Clear filters**. A failed recording offers a retry.
- Example data remains visibly synthetic. Pausing changes the displayed view and does not imply the collector has stopped.

## Brand and motion

`public/brand/ampere-mark.png` is a new AMPERE network/current monogram generated with ChatGPT image generation. Its exact final prompt and origin are recorded in `public/brand/PROVENANCE.md` and embedded in the PNG. No Auros logo or font is redistributed.

The canvas particle sphere is an atmospheric geometric visual, never a recording indicator. Its animation is capped at 25 frames per second, pauses outside the viewport and in background tabs, and draws a static sphere when reduced motion is enabled. Both routes share this component and the same brand mark.

## Verification

Browser coverage includes app-first entry, navigation to the optional explanation and back, reduced-motion rendering, responsive page/table containment, request detail focus/closing, native comparison disclosure, filtering, live polling and pause, export, report verification, and error recovery. Unit tests and the production build (including the bundle privacy check) are also run. Generated screenshots stay in ignored `artifacts/`.
